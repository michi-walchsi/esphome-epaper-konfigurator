import { useState, useEffect, useRef } from 'react';
import { IcoZap, IcoRefresh, IcoAlertCircle, IcoX } from './Icons';
import { validateEsphomeUrl } from '../utils/security';

/**
 * Two-step flash-method selection modal.
 *
 * Step 1 — choose USB (new device) or OTA (existing device).
 * Step 2 — pick USB port (from ESPHome /serial-ports) or ESPHome device
 *           (from ESPHome /devices).
 *
 * Security notes:
 * - ESPHome URL is validated before every fetch (http/https only).
 * - Fetched ports/devices are validated against expected formats; user never
 *   types a free-form port or device name.
 * - The port value sent back to the caller is always taken from the validated
 *   fetch response, never directly from user text input.
 * - External links (ESPHome login) use rel="noopener noreferrer".
 */
export default function InstallModal({ config, esphomeUrl, esphomeApiBase, deepSleepActive, onConfirm, onClose }) {
  const [method,    setMethod]    = useState(null);   // 'usb' | 'ota' | null
  const [ports,     setPorts]     = useState([]);
  const [devices,   setDevices]   = useState([]);
  const [selected,  setSelected]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [loadError, setLoadError] = useState(null);
  const fetchAbortRef = useRef(null);

  // Abort any in-flight fetch on method change or unmount
  useEffect(() => {
    if (method === 'usb') fetchPorts();
    if (method === 'ota') fetchDevices();
    return () => { fetchAbortRef.current?.abort(); };
  }, [method]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchPorts() {
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    const timeoutId = setTimeout(() => ctrl.abort(), 5000);
    setLoading(true); setLoadError(null); setPorts([]); setSelected('');
    try {
      const base = esphomeApiBase || validateEsphomeUrl(esphomeUrl);
      const res  = await fetch(`${base}/serial-ports`, {
        signal:      ctrl.signal,
        credentials: esphomeApiBase ? 'include' : 'same-origin',
      });
      if (res.status === 401 || res.status === 403) {
        setLoadError({ type: 'auth', base });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      // Accept only entries with a valid tty/COM path; exclude the 'OTA' sentinel
      const safe = (Array.isArray(raw) ? raw : []).filter(
        p => p
          && typeof p.port === 'string'
          && p.port !== 'OTA'
          && /^(\/dev\/tty[A-Za-z0-9/]+|COM\d{1,4})$/.test(p.port)
          && typeof p.desc === 'string'
          && p.desc.length < 200,
      );
      setPorts(safe);
    } catch (err) {
      if (err.name !== 'AbortError') setLoadError({ type: 'network', message: err.message });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function fetchDevices() {
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    const timeoutId = setTimeout(() => ctrl.abort(), 5000);
    setLoading(true); setLoadError(null); setDevices([]); setSelected('');
    try {
      const base = esphomeApiBase || validateEsphomeUrl(esphomeUrl);
      const res  = await fetch(`${base}/devices`, {
        signal:      ctrl.signal,
        credentials: esphomeApiBase ? 'include' : 'same-origin',
      });
      if (res.status === 401 || res.status === 403) {
        setLoadError({ type: 'auth', base });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw  = await res.json();
      // Accept device names matching ESPHome identifier pattern (allows underscores)
      const safe = (raw?.configured ?? []).filter(
        d => d
          && typeof d.name === 'string'
          && /^[a-z0-9][a-z0-9_-]*$/.test(d.name)
          && (d.address == null || (typeof d.address === 'string' && /^[a-zA-Z0-9._:-]{1,64}$/.test(d.address))),
      );
      setDevices(safe);
      // Pre-select the current device if it already exists in ESPHome
      const match = safe.find(d => d.name === config.deviceName);
      if (match) setSelected(match.name);
    } catch (err) {
      if (err.name !== 'AbortError') setLoadError({ type: 'network', message: err.message });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  // OTA: warn if the user picks a device whose name differs from the open config
  const nameMismatch = method === 'ota' && selected && selected !== config.deviceName;
  const canConfirm   = Boolean(method && selected && !loading && !loadError);

  function handleConfirm() {
    if (!canConfirm) return;
    if (method === 'usb') {
      // Re-validate: port must be in the list we received, not a free-form value
      const valid = ports.find(p => p.port === selected);
      if (!valid) return;
      onConfirm({ method: 'usb', port: valid.port, configName: config.deviceName });
    } else {
      const valid = devices.find(d => d.name === selected);
      if (!valid) return;
      // ESPHome expects the device's IP/hostname as upload-port for OTA
      const otaPort = valid.address || `${valid.name}.local`;
      onConfirm({ method: 'ota', port: otaPort, configName: valid.name });
    }
  }

  return (
    <div
      className="picker-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="install-modal">

        {/* Header */}
        <div className="install-modal-header">
          <span className="install-modal-title">Installationsmethode</span>
          <button className="picker-close" onClick={onClose} aria-label="Schließen">
            <IcoX size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="install-modal-body">

          {/* Step 1 — method cards */}
          <div className="install-options">
            <MethodCard
              active={method === 'usb'}
              icon="🔌"
              title="USB — Neuer ESP"
              desc="ESP ist neu und per USB am Raspberry Pi angeschlossen. Erst-Flash via Kabel."
              onClick={() => { setMethod('usb'); setLoadError(null); }}
            />
            <MethodCard
              active={method === 'ota'}
              icon="📡"
              title="OTA — Bereits in ESPHome"
              desc="ESP ist bereits konfiguriert und im WLAN. Update über WiFi."
              onClick={() => { setMethod('ota'); setLoadError(null); }}
            />
          </div>

          {/* Step 2 — USB */}
          {method === 'usb' && (
            <div className="install-step">
              <div className="install-warning">
                ⚠️&nbsp; ESP muss per USB am Raspberry Pi angesteckt sein
              </div>
              <div className="install-config-info">
                Gerät wird gespeichert als: <code>{config.deviceName}.yaml</code>
              </div>
              {loading && <Spinner label="Lade USB-Ports…" />}
              {loadError && (
                <ErrorRow error={loadError} onRetry={fetchPorts} />
              )}
              {!loading && !loadError && ports.length === 0 && (
                <div className="install-empty">
                  Keine USB-Ports gefunden — ESP anstecken und{' '}
                  <button className="btn-inline" onClick={fetchPorts}>neu laden</button>.
                </div>
              )}
              {ports.length > 0 && (
                <SelectList
                  items={ports.map(p => ({ value: p.port, label: p.port, hint: p.desc }))}
                  selected={selected}
                  name="usb-port"
                  label="Verfügbare USB-Ports"
                  onSelect={setSelected}
                />
              )}
            </div>
          )}

          {/* Step 2 — OTA */}
          {method === 'ota' && (
            <div className="install-step">
              {deepSleepActive && (
                <div className="install-info">
                  💤&nbsp; Deep Sleep aktiv — Update wird beim nächsten Aufwachen installiert
                </div>
              )}
              {loading && <Spinner label="Lade ESPHome-Geräte…" />}
              {loadError && (
                <ErrorRow error={loadError} onRetry={fetchDevices} />
              )}
              {!loading && !loadError && devices.length === 0 && (
                <div className="install-empty">
                  Keine ESPHome-Geräte gefunden —{' '}
                  <button className="btn-inline" onClick={fetchDevices}>neu laden</button>.
                </div>
              )}
              {devices.length > 0 && (
                <SelectList
                  items={devices.map(d => ({
                    value: d.name,
                    label: d.name,
                    hint:  (d.address && /^[a-zA-Z0-9._:-]{1,64}$/.test(d.address)) ? d.address : '—',
                  }))}
                  selected={selected}
                  name="ota-device"
                  label="ESPHome Geräte"
                  onSelect={setSelected}
                />
              )}
              {nameMismatch && (
                <div className="install-warning" style={{ marginTop: 8 }}>
                  ⚠️&nbsp; YAML-Gerätename (<code>{config.deviceName}</code>) stimmt nicht mit
                  Auswahl überein — Konfiguration wird als <code>{selected}.yaml</code> gespeichert.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="install-modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
            <IcoZap size={14} />
            Auf Gerät installieren
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function MethodCard({ active, icon, title, desc, onClick }) {
  return (
    <button className={`install-option${active ? ' active' : ''}`} onClick={onClick}>
      <span className="install-option-icon" aria-hidden="true">{icon}</span>
      <div>
        <div className="install-option-title">{title}</div>
        <div className="install-option-desc">{desc}</div>
      </div>
    </button>
  );
}

function SelectList({ items, selected, name, label, onSelect }) {
  return (
    <div className="install-list">
      <div className="install-list-label">{label}</div>
      {items.map(({ value, label: itemLabel, hint }) => (
        <label
          key={value}
          className={`install-item${selected === value ? ' active' : ''}`}
        >
          <input
            type="radio"
            name={name}
            value={value}
            checked={selected === value}
            onChange={() => onSelect(value)}
          />
          <span className="install-item-name">{itemLabel}</span>
          <span className="install-item-hint">{hint}</span>
        </label>
      ))}
    </div>
  );
}

function Spinner({ label }) {
  return (
    <div className="install-loading">
      <IcoRefresh size={13} className="spin" />
      {' '}{label}
    </div>
  );
}

function ErrorRow({ error, onRetry }) {
  return (
    <div className="install-error">
      <IcoAlertCircle size={13} />
      {error.type === 'auth' ? (
        <span>
          {' '}Keine Berechtigung —{' '}
          <a
            href={error.base || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="install-link"
          >
            Bei ESPHome einloggen
          </a>
          {', dann '}
          <button className="btn-inline" onClick={onRetry}>neu versuchen</button>.
        </span>
      ) : (
        <span>
          {' '}{error.message || 'Verbindungsfehler'}{' — '}
          <button className="btn-inline" onClick={onRetry}>Neu laden</button>
        </span>
      )}
    </div>
  );
}
