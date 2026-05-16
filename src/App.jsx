import { useState, useEffect, useMemo, useCallback } from 'react';
import { DISPLAYS, BOARDS } from './utils/displays';
import { DEMO_ENTITIES } from './utils/entities';
import { generateYaml } from './utils/yamlGenerator';
import { validateEsphomeUrl } from './utils/security';
import DevicesTab      from './components/DevicesTab';
import ConfiguratorTab from './components/ConfiguratorTab';
import YamlTab         from './components/YamlTab';
import {
  IcoMonitor, IcoList, IcoSettings, IcoFile, IcoHome, IcoCpu,
} from './components/Icons';

export const APP_VERSION = '1.9.8';


// Voltage divider presets (multiplier = inverse of divider ratio)
export const VOLTAGE_PRESETS = [
  { id: 'firebeetle', label: 'FireBeetle ESP32 (×2.0)', multiplier: 2.0 },
  { id: 'lolin-d32',  label: 'LOLIN D32 (×2.0)',        multiplier: 2.0 },
  { id: 'ttgo-t5',    label: 'TTGO T5 (×2.0)',           multiplier: 2.0 },
  { id: 'custom',     label: 'Eigener Wert',             multiplier: null },
];

// These demo device names are removed from localStorage automatically on first load
const LEGACY_DEMO_NAMES = new Set([
  'wohnzimmer-display', 'schlafzimmer-sensor', 'garten-monitor',
]);

const INIT_CONFIG = {
  title:             'Mein Dashboard',
  deviceName:        'epaper-display',
  displayName:       'E-Paper Display',
  board:             BOARDS[0],
  display:           DISPLAYS[0],
  customWidth:       800,
  customHeight:      480,
  spiPins:           { cs: 'GPIO5', dc: 'GPIO17', rst: 'GPIO16', busy: 'GPIO4', clk: 'GPIO18', mosi: 'GPIO23' },
  deepSleep:            0,
  deepSleepUnit:        'min', // 's' | 'min' | 'h'
  gridCols:             3,
  // Battery: local ADC mode (batteryPresent=true) or HA entity mode (batteryEntityId)
  batteryPresent:    false,
  batteryPin:        'GPIO34',
  batteryPreset:     'firebeetle',
  voltageMultiplier: 2.0,
  batteryEntityId:   '',
  wifiSsid:          '',
  wifiPassword:      '',
  esphomeUrl:        'http://homeassistant.local:6052',
};

const TABS = [
  { id: 'devices',      Icon: IcoList,     label: 'Geräte'       },
  { id: 'configurator', Icon: IcoSettings, label: 'Konfigurator' },
  { id: 'yaml',         Icon: IcoFile,     label: 'YAML'         },
];

export default function App({ hass = null }) {
  const [tab,            setTab]            = useState('devices');
  const [config,         setConfig]         = useState(INIT_CONFIG);
  const [slots,          setSlots]          = useState([]);
  const [entities,       setEntities]       = useState(DEMO_ENTITIES);
  const [esphomeStatus,  setEsphomeStatus]  = useState('idle');
  const [esphomeVersion, setEsphomeVersion] = useState(null);
  const [esphomeConfigs, setEsphomeConfigs] = useState([]);
  const [esphomeApiBase, setEsphomeApiBase] = useState(null);
  const [showNewDialog,  setShowNewDialog]  = useState(false);
  const [devices,        setDevices]        = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('esphome_devices')) ?? [];
      // Auto-migrate: wipe known demo devices added in earlier app versions
      return stored.filter(d => !LEGACY_DEMO_NAMES.has(d.name));
    } catch { return []; }
  });

  const isPanel = hass !== null;

  // Resolve ESPHome ingress URL via HA Supervisor WebSocket API.
  // Sets esphomeApiBase + ingress_session cookie so all API calls go through ingress (same-origin).
  const resolveIngress = useCallback(async (hassObj) => {
    if (!hassObj?.connection) return;
    try {
      const [sessRes, addonsRes] = await Promise.all([
        hassObj.connection.sendMessagePromise({ type: 'supervisor/api', endpoint: '/ingress/session', method: 'POST' }),
        hassObj.connection.sendMessagePromise({ type: 'supervisor/api', endpoint: '/addons',          method: 'GET'  }),
      ]);
      const session = String(sessRes?.session ?? '');
      if (session && /^[A-Za-z0-9_\-+=/.]{10,400}$/.test(session)) {
        document.cookie = `ingress_session=${session}; path=/; SameSite=Strict`;
      }
      const addon = (addonsRes?.addons ?? []).find(
        a => a.name?.toLowerCase().includes('esphome') && a.state === 'started',
      );
      if (!addon) return;
      const info = await hassObj.connection.sendMessagePromise({
        type: 'supervisor/api', endpoint: `/addons/${addon.slug}/info`, method: 'GET',
      });
      if (info?.ingress_entry) {
        setEsphomeApiBase(window.location.origin + info.ingress_entry);
      }
    } catch { /* Supervisor not available (dev mode or non-supervisor HA) */ }
  }, []);

  // Load real HA entities whenever hass changes
  useEffect(() => {
    if (!hass?.states) return;
    setEntities(
      Object.values(hass.states).sort((a, b) => a.entity_id.localeCompare(b.entity_id))
    );
    // Show installed ESPHome version from HA update entity (doesn't imply API reachability)
    const esphomeUpdate = hass.states['update.esphome_device_builder_update'];
    if (esphomeUpdate) {
      setEsphomeVersion(esphomeUpdate.attributes?.installed_version ?? null);
    }
    resolveIngress(hass);
  }, [hass, resolveIngress]);

  useEffect(() => {
    localStorage.setItem('esphome_devices', JSON.stringify(devices));
  }, [devices]);

  const checkEsphome = useCallback(async (url) => {
    let base;
    try { base = validateEsphomeUrl(url || config.esphomeUrl); } catch {
      setEsphomeStatus('error'); return;
    }
    setEsphomeStatus('loading');

    // no-cors: browser sends request without CORS preflight — no console CORS errors.
    // An opaque response (server replied) = reachable; network exception = not reachable.
    // ESPHome version is read from hass.states update entity, not from this fetch.
    try {
      await fetch(`${base}/version`, { signal: AbortSignal.timeout(5000), mode: 'no-cors' });
      setEsphomeStatus('ok');
    } catch {
      setEsphomeStatus('error');
    }
  }, [config.esphomeUrl]);

  const loadEsphomeConfigs = useCallback(async () => {
    if (!esphomeApiBase) return;
    try {
      const res = await fetch(`${esphomeApiBase}/devices`, {
        signal:      AbortSignal.timeout(5000),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setEsphomeConfigs(
          (data?.configured ?? [])
            .map(d => (typeof d === 'string' ? d : d.name))
            .filter(Boolean),
        );
      }
    } catch {
      setEsphomeConfigs([]);
    }
  }, [esphomeApiBase]);

  // Fetch YAML from ESPHome, extract friendly_name, open device in Konfigurator
  const importDevice = useCallback(async (devName) => {
    if (!esphomeApiBase) return;
    try {
      const res = await fetch(
        `${esphomeApiBase}/edit?configuration=${encodeURIComponent(devName + '.yaml')}`,
        { signal: AbortSignal.timeout(5000), credentials: 'include' },
      );
      if (!res.ok) return;
      const yamlText = await res.text();
      let friendly = '';
      let inEsphome = false;
      for (const line of yamlText.split('\n')) {
        if (/^esphome:/.test(line)) { inEsphome = true; continue; }
        if (inEsphome && /^\w/.test(line)) break;
        if (inEsphome) {
          const m = line.match(/^\s+friendly_name:\s*(.+)$/);
          if (m) { friendly = m[1].trim().replace(/['"]/g, ''); break; }
        }
      }
      setConfig(p => ({
        ...p,
        deviceName:  devName,
        displayName: friendly || devName.replace(/-/g, ' '),
      }));
      setSlots([]);
      setTab('configurator');
    } catch { /* ignore */ }
  }, [esphomeApiBase]);

  useEffect(() => { checkEsphome(); }, []);

  const effectiveDisplay = useMemo(() =>
    config.display.isCustom
      ? { ...config.display, width: config.customWidth, height: config.customHeight }
      : config.display,
    [config]
  );

  const effectiveConfig = useMemo(
    () => ({ ...config, display: effectiveDisplay }),
    [config, effectiveDisplay]
  );

  const yaml = useMemo(() => generateYaml(effectiveConfig, slots), [effectiveConfig, slots]);

  // When batteryPresent, the entity ID is auto-generated from the device name
  const effectiveBatteryEntityId = useMemo(() => {
    if (config.batteryPresent) return `sensor.${config.deviceName.replace(/-/g, '_')}_batterie`;
    return config.batteryEntityId || '';
  }, [config.batteryPresent, config.deviceName, config.batteryEntityId]);

  const batteryLevel = useMemo(() => {
    if (!effectiveBatteryEntityId) return null;
    const e = entities.find(en => en.entity_id === effectiveBatteryEntityId);
    const v = e ? parseFloat(e.state) : NaN;
    return isNaN(v) ? null : v;
  }, [effectiveBatteryEntityId, entities]);

  const openDevice = useCallback((device) => {
    if (device.config) {
      setConfig(p => ({ ...p, ...device.config }));
    }
    setSlots(device.slots ?? []);
    setTab('configurator');
  }, []);

  const saveDevice = useCallback(() => {
    // eslint-disable-next-line no-unused-vars
    const { wifiPassword: _pw, ...configToSave } = config;
    const device = {
      name:        config.deviceName,
      displayName: config.displayName,
      board:       config.board.name,
      display:     config.display.name,
      ip:          '',
      savedAt:     Date.now(),
      config:      configToSave,
      slots:       slots,
    };
    setDevices(prev => {
      const filtered = prev.filter(d => d.name !== device.name);
      return [device, ...filtered];
    });
  }, [config, slots]);

  const handleNewDevice = useCallback((deviceName) => {
    const newConfig = { ...INIT_CONFIG, deviceName, displayName: deviceName.replace(/-/g, ' ') };
    setConfig(newConfig);
    setSlots([]);
    setShowNewDialog(false);
    setTab('configurator');
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <IcoMonitor size={22} className="app-logo" />
          <div>
            <div className="app-title">E-Paper-Maker</div>
            <div className="app-sub">
              v{APP_VERSION}
              {!isPanel && <span style={{ marginLeft: 6, color: 'var(--accent)' }}>· Dev-Modus</span>}
            </div>
          </div>
        </div>
        <div className="app-header-right">
          <StatusBadge icon={<IcoCpu size={13} />} label="ESPHome" status={esphomeStatus}
            overrideText={esphomeVersion ? `v${esphomeVersion}` : undefined} />
          <StatusBadge icon={<IcoHome size={13} />} label="HA" status={isPanel ? 'ok' : 'demo'}
            overrideText={isPanel ? `${entities.length} Entitäten` : 'Dev-Modus'} />
          {batteryLevel !== null && <BatteryBadge level={batteryLevel} />}
        </div>
      </header>

      <nav className="app-tabbar">
        {TABS.map(({ id, Icon, label }) => (
          <button
            key={id}
            className={`app-tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} className="app-tab-icon" />
            {label}
          </button>
        ))}
      </nav>

      <div className="app-content">
        {tab === 'devices' && (
          <DevicesTab
            devices={devices}
            esphomeStatus={esphomeStatus}
            esphomeVersion={esphomeVersion}
            esphomeConfigs={esphomeConfigs}
            esphomeUrl={config.esphomeUrl}
            esphomeApiBase={esphomeApiBase}
            onUrlChange={url => { setConfig(p => ({ ...p, esphomeUrl: url })); checkEsphome(url); }}
            onRefresh={() => checkEsphome()}
            onLoadConfigs={loadEsphomeConfigs}
            onImportDevice={importDevice}
            onOpen={openDevice}
            onDelete={name => setDevices(prev => prev.filter(d => d.name !== name))}
            onNew={() => setShowNewDialog(true)}
          />
        )}
        {tab === 'configurator' && (
          <ConfiguratorTab
            config={effectiveConfig}
            slots={slots}
            entities={entities}
            batteryLevel={batteryLevel}
            isPanel={isPanel}
            hass={hass}
            esphomeUrl={config.esphomeUrl}
            esphomeApiBase={esphomeApiBase}
            yaml={yaml}
            onChange={setConfig}
            onSlotsChange={setSlots}
            onSave={saveDevice}
          />
        )}
        {tab === 'yaml' && (
          <YamlTab yaml={yaml} deviceName={config.deviceName} />
        )}
      </div>

      {showNewDialog && (
        <NewDeviceDialog
          onConfirm={handleNewDevice}
          onCancel={() => setShowNewDialog(false)}
        />
      )}
    </div>
  );
}

function NewDeviceDialog({ onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const valid = /^[a-z0-9][a-z0-9-]*$/.test(name);

  return (
    <div className="picker-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="new-device-dialog">
        <div className="new-device-dialog-title">Neues Gerät anlegen</div>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label>Gerätename <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(ESPHome Identifier)</span></label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+/, ''))}
            placeholder="mein-display"
            style={{ fontFamily: 'var(--mono)' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && valid) onConfirm(name);
              if (e.key === 'Escape') onCancel();
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
            Kleinbuchstaben und Bindestriche · wird als ESPHome Hostname verwendet
          </span>
        </div>
        <div className="new-device-dialog-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onConfirm(name)}>
            Konfigurator öffnen →
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon, label, status, overrideText }) {
  const colors = { idle: '#484f58', loading: '#d29922', ok: '#3fb950', error: '#f85149', demo: '#58a6ff' };
  const texts  = { idle: 'Nicht verbunden', loading: 'Verbinde…', ok: 'Verbunden', error: 'Fehler', demo: 'Dev' };
  const color  = colors[status] ?? '#484f58';
  const text   = overrideText ?? texts[status] ?? status;
  return (
    <div className="status-badge" style={{ '--sc': color }}>
      <span className="status-icon">{icon}</span>
      <span className="status-dot">●</span>
      <span className="status-text">{label}: {text}</span>
    </div>
  );
}

function BatteryBadge({ level }) {
  const color = level < 20 ? '#f85149' : level < 50 ? '#d29922' : '#3fb950';
  return (
    <div className="batt-badge" style={{ '--bc': color, '--bf': `${level}%` }}>
      <div className="batt-body"><div className="batt-fill" /></div>
      <div className="batt-cap" />
      <span>{Math.round(level)}%</span>
    </div>
  );
}
