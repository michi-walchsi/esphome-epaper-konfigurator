import { useState, useEffect, useMemo, useCallback } from 'react';
import { DISPLAYS, BOARDS } from './utils/displays';
import { DEMO_ENTITIES } from './utils/entities';
import { generateYaml } from './utils/yamlGenerator';
import DevicesTab      from './components/DevicesTab';
import ConfiguratorTab from './components/ConfiguratorTab';
import YamlTab         from './components/YamlTab';
import {
  IcoMonitor, IcoList, IcoSettings, IcoFile, IcoHome, IcoCpu,
} from './components/Icons';

const INIT_CONFIG = {
  title:          'Mein Dashboard',
  deviceName:     'epaper-display',
  displayName:    'E-Paper Display',
  board:          BOARDS[0],
  display:        DISPLAYS[0],
  customWidth:    800,
  customHeight:   480,
  spiPins:        { cs: 'GPIO5', dc: 'GPIO17', rst: 'GPIO16', busy: 'GPIO4', clk: 'GPIO18', mosi: 'GPIO23' },
  deepSleep:      0,
  updateInterval: 60,
  gridCols:       3,
  batteryEntityId:'',
  wifiSsid:       '',
  wifiPassword:   '',
  esphomeUrl:     'http://homeassistant.local:6052',
};

const INIT_SLOTS = [
  { id: '1', title: 'Temperatur',       unit: '°C',  entityId: 'sensor.temperature_living_room', size: 'small'  },
  { id: '2', title: 'Luftfeuchtigkeit', unit: '%',   entityId: 'sensor.humidity_living_room',    size: 'small'  },
  { id: '3', title: 'CO₂',             unit: 'ppm', entityId: 'sensor.co2_living_room',          size: 'medium' },
  { id: '4', title: 'Helligkeit',       unit: 'lx',  entityId: 'sensor.illuminance',              size: 'small'  },
];

const DEMO_DEVICES = [
  {
    name:        'wohnzimmer-display',
    displayName: 'Wohnzimmer Display',
    board:       BOARDS[0].name,
    display:     DISPLAYS[0].name,
    savedAt:     Date.now() - 86400000,
    config:      { ...INIT_CONFIG, deviceName: 'wohnzimmer-display', displayName: 'Wohnzimmer Display', deepSleep: 0, board: BOARDS[0], display: DISPLAYS[0], batteryEntityId: 'sensor.epaper_battery' },
    slots:       INIT_SLOTS,
  },
  {
    name:        'schlafzimmer-sensor',
    displayName: 'Schlafzimmer Sensor',
    board:       BOARDS[1].name,
    display:     DISPLAYS[2].name,
    savedAt:     Date.now() - 7200000,
    config:      { ...INIT_CONFIG, deviceName: 'schlafzimmer-sensor', displayName: 'Schlafzimmer Sensor', deepSleep: 30, board: BOARDS[1], display: DISPLAYS[2] },
    slots:       [
      { id: '10', title: 'Temperatur',       unit: '°C', entityId: 'sensor.temperature_bedroom',  size: 'medium' },
      { id: '11', title: 'Luftfeuchtigkeit', unit: '%',  entityId: 'sensor.humidity_bedroom',      size: 'medium' },
    ],
  },
  {
    name:        'garten-monitor',
    displayName: 'Garten Monitor',
    board:       BOARDS[3].name,
    display:     DISPLAYS[1].name,
    savedAt:     Date.now() - 259200000,
    status:      'offline',
    config:      { ...INIT_CONFIG, deviceName: 'garten-monitor', displayName: 'Garten Monitor', deepSleep: 0, board: BOARDS[3], display: DISPLAYS[1] },
    slots:       [
      { id: '20', title: 'Außentemperatur', unit: '°C',  entityId: 'sensor.temperature_outdoor', size: 'medium' },
      { id: '21', title: 'Windgeschw.',     unit: 'km/h', entityId: 'sensor.wind_speed',          size: 'small'  },
      { id: '22', title: 'Regen heute',     unit: 'mm',  entityId: 'sensor.rain_today',           size: 'small'  },
    ],
  },
];

const TABS = [
  { id: 'devices',      Icon: IcoList,     label: 'Geräte'       },
  { id: 'configurator', Icon: IcoSettings, label: 'Konfigurator' },
  { id: 'yaml',         Icon: IcoFile,     label: 'YAML'         },
];

export default function App({ hass = null }) {
  const [tab,           setTab]           = useState('devices');
  const [config,        setConfig]        = useState(INIT_CONFIG);
  const [slots,         setSlots]         = useState(INIT_SLOTS);
  const [entities,      setEntities]      = useState(DEMO_ENTITIES);
  const [esphomeStatus,  setEsphomeStatus]  = useState('idle');
  const [esphomeVersion, setEsphomeVersion] = useState(null);
  const [esphomeConfigs, setEsphomeConfigs] = useState([]);
  const [showNewDialog,  setShowNewDialog]  = useState(false);
  const [devices,        setDevices]        = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('esphome_devices'));
      return stored?.length ? stored : DEMO_DEVICES;
    } catch { return DEMO_DEVICES; }
  });

  const isPanel = hass !== null;

  useEffect(() => {
    if (!hass?.states) return;
    setEntities(
      Object.values(hass.states).sort((a, b) => a.entity_id.localeCompare(b.entity_id))
    );
  }, [hass]);

  useEffect(() => {
    localStorage.setItem('esphome_devices', JSON.stringify(devices));
  }, [devices]);

  const checkEsphome = useCallback(async (url) => {
    const base = (url || config.esphomeUrl).replace(/\/$/, '');
    setEsphomeStatus('loading');
    setEsphomeVersion(null);
    try {
      const res = await fetch(`${base}/version`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setEsphomeVersion(data?.version ?? null);
      }
      setEsphomeStatus('ok');
    } catch {
      try {
        await fetch(`${base}/version`, { signal: AbortSignal.timeout(4000), mode: 'no-cors' });
        setEsphomeStatus('ok');
      } catch {
        setEsphomeStatus('error');
      }
    }
  }, [config.esphomeUrl]);

  const loadEsphomeConfigs = useCallback(async () => {
    const base = config.esphomeUrl.replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/configurations`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json().catch(() => []);
        setEsphomeConfigs(Array.isArray(data) ? data : []);
      }
    } catch {
      setEsphomeConfigs([]);
    }
  }, [config.esphomeUrl]);

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

  const batteryLevel = useMemo(() => {
    if (!config.batteryEntityId) return null;
    const e = entities.find(en => en.entity_id === config.batteryEntityId);
    const v = e ? parseFloat(e.state) : NaN;
    return isNaN(v) ? null : v;
  }, [config.batteryEntityId, entities]);

  const openDevice = useCallback((device) => {
    if (device.config) setConfig(p => ({ ...p, ...device.config }));
    if (device.slots)  setSlots(device.slots);
    setTab('configurator');
  }, []);

  const saveDevice = useCallback(() => {
    const device = {
      name:        config.deviceName,
      displayName: config.displayName,
      board:       config.board.name,
      display:     config.display.name,
      ip:          '',
      savedAt:     Date.now(),
      config:      { ...config },
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
            <div className="app-title">ESPHome e-Paper Konfigurator</div>
            <div className="app-sub">HACS Custom Panel · {effectiveDisplay.width}×{effectiveDisplay.height}px</div>
          </div>
        </div>
        <div className="app-header-right">
          <StatusBadge icon={<IcoCpu size={13} />} label="ESPHome" status={esphomeStatus}
            overrideText={esphomeVersion ? `v${esphomeVersion}` : undefined} />
          <StatusBadge icon={<IcoHome size={13} />} label="HA" status={isPanel ? 'ok' : 'demo'}
            overrideText={isPanel ? `${entities.length} Entitäten` : 'Demo-Modus'} />
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
            onUrlChange={url => { setConfig(p => ({ ...p, esphomeUrl: url })); checkEsphome(url); }}
            onRefresh={() => checkEsphome()}
            onLoadConfigs={loadEsphomeConfigs}
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
  const texts  = { idle: 'Nicht verbunden', loading: 'Verbinde…', ok: 'Verbunden', error: 'Fehler', demo: 'Demo' };
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
