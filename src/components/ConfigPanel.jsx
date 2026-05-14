import { useState } from 'react';
import { DISPLAYS, BOARDS } from '../utils/displays';
import EntityPicker from './EntityPicker';

export default function ConfigPanel({ config, onChange, entities, haConnection, setHaConnection, haStatus, onConnect, onDemo }) {
  const [batteryPickerOpen, setBatteryPickerOpen] = useState(false);

  const set   = (key, val) => onChange(p => ({ ...p, [key]: val }));
  const pin   = (k, val)   => onChange(p => ({ ...p, spiPins: { ...p.spiPins, [k]: val } }));
  const setHA = (key, val) => setHaConnection(p => ({ ...p, [key]: val }));
  const isLilygo = config.display.platform === 'lilygo_t5_47';

  const statusMeta = {
    idle:    { dot: '⬤', color: '#484f58', text: 'Demo-Modus — Beispiel-Entitäten' },
    loading: { dot: '⬤', color: '#d29922', text: 'Verbinde…' },
    ok:      { dot: '⬤', color: '#3fb950', text: `Verbunden · ${entities.length} Entitäten geladen` },
    error:   { dot: '⬤', color: '#f85149', text: 'Verbindungsfehler — URL oder Token prüfen' },
    hacs:    { dot: '⬤', color: '#ff9800', text: `HACS-Modus · ${entities.length} HA-Entitäten` },
  };
  const sm = statusMeta[haStatus] ?? statusMeta.idle;

  return (
    <div className="config-panel">

      {/* ── Display & Gerät ── */}
      <div className="config-section">
        <div className="section-title">Display &amp; Gerät</div>

        <div className="form-group">
          <label>Dashboard-Titel</label>
          <input value={config.title} onChange={e => set('title', e.target.value)} placeholder="Mein Dashboard" />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Gerätename (ESPHome)</label>
            <input
              value={config.deviceName}
              onChange={e => set('deviceName', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="epaper-display"
            />
          </div>
          <div className="form-group">
            <label>Anzeigename (HA)</label>
            <input value={config.displayName} onChange={e => set('displayName', e.target.value)} placeholder="E-Paper Display" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>ESP Board</label>
            <select value={config.board.id} onChange={e => set('board', BOARDS.find(b => b.id === e.target.value))}>
              {BOARDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Display-Modell</label>
            <select value={config.display.id} onChange={e => set('display', DISPLAYS.find(d => d.id === e.target.value))}>
              {DISPLAYS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {config.display.isCustom && (
          <div className="form-row">
            <div className="form-group">
              <label>Breite (px)</label>
              <input type="number" value={config.customWidth}  min={100} max={2000} onChange={e => set('customWidth',  +e.target.value)} />
            </div>
            <div className="form-group">
              <label>Höhe (px)</label>
              <input type="number" value={config.customHeight} min={100} max={2000} onChange={e => set('customHeight', +e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── SPI Pins ── */}
      {!isLilygo && (
        <div className="config-section">
          <div className="section-title">SPI Pins</div>
          <div className="form-row">
            <div className="form-group"><label>CS</label>    <input value={config.spiPins.cs}   onChange={e => pin('cs',   e.target.value)} /></div>
            <div className="form-group"><label>DC</label>    <input value={config.spiPins.dc}   onChange={e => pin('dc',   e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Reset</label> <input value={config.spiPins.rst}  onChange={e => pin('rst',  e.target.value)} /></div>
            <div className="form-group"><label>Busy</label>  <input value={config.spiPins.busy} onChange={e => pin('busy', e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>CLK</label>   <input value={config.spiPins.clk}  onChange={e => pin('clk',  e.target.value)} /></div>
            <div className="form-group"><label>MOSI</label>  <input value={config.spiPins.mosi} onChange={e => pin('mosi', e.target.value)} /></div>
          </div>
        </div>
      )}

      {/* ── Timing & Grid ── */}
      <div className="config-section">
        <div className="section-title">Timing &amp; Grid</div>
        <div className="form-row">
          <div className="form-group">
            <label>Deep Sleep (Minuten)</label>
            <input type="number" value={config.deepSleep}      min={1}  max={1440} onChange={e => set('deepSleep',      +e.target.value)} />
          </div>
          <div className="form-group">
            <label>Update-Intervall (s)</label>
            <input type="number" value={config.updateInterval} min={10} max={3600} onChange={e => set('updateInterval', +e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Grid-Spalten</label>
          <div className="btn-group">
            {[2, 3, 4, 5].map(n => (
              <button key={n} className={`grid-btn${config.gridCols === n ? ' active' : ''}`} onClick={() => set('gridCols', n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Batterie ── */}
      <div className="config-section">
        <div className="section-title">Batterie-Status</div>
        <div className="form-group">
          <label>Batterie Entity ID</label>
          <div className="entity-input-row">
            <input
              value={config.batteryEntityId}
              onChange={e => set('batteryEntityId', e.target.value)}
              placeholder="sensor.epaper_battery"
            />
            <button className="entity-picker-btn" onClick={() => setBatteryPickerOpen(true)} title="Entity auswählen">⊞</button>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
            0–20 % rot · 20–50 % gelb · 50–100 % grün
          </span>
        </div>
        {batteryPickerOpen && (
          <EntityPicker
            entities={entities}
            isOpen={batteryPickerOpen}
            onClose={() => setBatteryPickerOpen(false)}
            onSelect={entity => { set('batteryEntityId', entity.entity_id); setBatteryPickerOpen(false); }}
          />
        )}
      </div>

      {/* ── Home Assistant Verbindung ── */}
      <div className="config-section">
        <div className="section-title">Home Assistant Verbindung</div>

        <div className="ha-mode-row">
          <button
            className={`ha-mode-btn${haConnection.mode === 'demo' ? ' active' : ''}`}
            onClick={onDemo}
          >
            Demo-Modus
          </button>
          <button
            className={`ha-mode-btn${haConnection.mode === 'ha' ? ' active' : ''}`}
            onClick={() => setHA('mode', 'ha')}
          >
            Home Assistant
          </button>
        </div>

        <div className="ha-status-row">
          <span className="ha-dot" style={{ color: sm.color }}>{sm.dot}</span>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{sm.text}</span>
        </div>

        {haConnection.mode === 'ha' && haStatus !== 'hacs' && (
          <>
            <div className="form-group">
              <label>HA URL</label>
              <input
                value={haConnection.url}
                onChange={e => setHA('url', e.target.value)}
                placeholder="http://homeassistant.local:8123"
              />
            </div>
            <div className="form-group">
              <label>Long-Lived Access Token</label>
              <input
                type="password"
                value={haConnection.token}
                onChange={e => setHA('token', e.target.value)}
                placeholder="eyJ0eXAiOiJKV1Qi…"
                autoComplete="new-password"
              />
            </div>
            <div className="ha-connect-row">
              <button
                className="ha-connect-btn"
                onClick={onConnect}
                disabled={haStatus === 'loading' || !haConnection.url || !haConnection.token}
              >
                {haStatus === 'loading' ? 'Verbinde…' : '🔌 Verbinden'}
              </button>
              {haStatus === 'ok' && (
                <button className="ha-connect-btn" onClick={onConnect} title="Neu laden" style={{ background: 'var(--bg-2)' }}>
                  ↺ Aktualisieren
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
              Token wird im Browser gespeichert. Profil → Sicherheit → Langlebige Token erstellen.
            </p>
          </>
        )}
      </div>

    </div>
  );
}
