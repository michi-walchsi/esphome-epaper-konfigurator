import { useState, useEffect, useMemo, useCallback } from 'react';
import { DISPLAYS, BOARDS } from './utils/displays';
import { DEMO_ENTITIES } from './utils/entities';
import { generateYaml } from './utils/yamlGenerator';
import DevicesTab      from './components/DevicesTab';
import ConfiguratorTab from './components/ConfiguratorTab';
import YamlTab         from './components/YamlTab';

const INIT_CONFIG = {
  title:          'Mein Dashboard',
  deviceName:     'epaper-display',
  displayName:    'E-Paper Display',
  board:          BOARDS[0],
  display:        DISPLAYS[0],
  customWidth:    800,
  customHeight:   480,
  spiPins:        { cs: 'GPIO5', dc: 'GPIO17', rst: 'GPIO16', busy: 'GPIO4', clk: 'GPIO18', mosi: 'GPIO23' },
  deepSleep:      30,
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

export default function App({ hass = null }) {
  const [tab,           setTab]           = useState('devices');
  const [config,        setConfig]        = useState(INIT_CONFIG);
  const [slots,         setSlots]         = useState(INIT_SLOTS);
  const [entities,      setEntities]      = useState(DEMO_ENTITIES);
  const [esphomeStatus,  setEsphomeStatus]  = useState('idle');
  const [esphomeVersion, setEsphomeVersion] = useState(null);
  const [esphomeConfigs, setEsphomeConfigs] = useState([]);
  const [devices,        setDevices]        = useState(() => {
    try { return JSON.parse(localStorage.getItem('esphome_devices') || '[]'); }
    catch { return []; }
  });

  const isPanel = hass !== null;

  // Sync entities from hass prop when running as HA Panel
  useEffect(() => {
    if (!hass?.states) return;
    setEntities(
      Object.values(hass.states).sort((a, b) => a.entity_id.localeCompare(b.entity_id))
    );
  }, [hass]);

  // Persist devices to localStorage
  useEffect(() => {
    localStorage.setItem('esphome_devices', JSON.stringify(devices));
  }, [devices]);

  const checkEsphome = useCallback(async (url) => {
    const base = (url || config.esphomeUrl).replace(/\/$/, '');
    setEsphomeStatus('loading');
    setEsphomeVersion(null);
    try {
      // Try with CORS first (ESPHome 2023+ sets Access-Control-Allow-Origin: *)
      const res = await fetch(`${base}/version`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        setEsphomeVersion(data?.version ?? null);
      }
      setEsphomeStatus('ok');
    } catch {
      // Fall back to no-cors connectivity probe (response body unreadable)
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
      name:       config.deviceName,
      displayName: config.displayName,
      board:      config.board.name,
      display:    config.display.name,
      ip:         '',
      savedAt:    Date.now(),
      config:     { ...config },
      slots:      slots,
    };
    setDevices(prev => {
      const filtered = prev.filter(d => d.name !== device.name);
      return [device, ...filtered];
    });
  }, [config, slots]);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-icon">🖥</span>
          <div>
            <div className="app-title">ESPHome e-Paper Konfigurator</div>
            <div className="app-sub">HACS Custom Panel · {effectiveDisplay.width}×{effectiveDisplay.height}px</div>
          </div>
        </div>
        <div className="app-header-right">
          <StatusBadge icon="⊡" label="ESPHome" status={esphomeStatus}
            overrideText={esphomeVersion ? `v${esphomeVersion}` : undefined} />
          <StatusBadge icon="🏠" label="HA" status={isPanel ? 'ok' : 'demo'}
            overrideText={isPanel ? `${entities.length} Entitäten` : 'Demo-Modus'} />
          {batteryLevel !== null && <BatteryBadge level={batteryLevel} />}
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="app-tabbar">
        {[
          { id: 'devices',      label: '📋 Geräte'       },
          { id: 'configurator', label: '⚙ Konfigurator'  },
          { id: 'yaml',         label: '📄 YAML'          },
        ].map(t => (
          <button
            key={t.id}
            className={`app-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
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
            onNew={() => { setConfig(INIT_CONFIG); setSlots(INIT_SLOTS); setTab('configurator'); }}
          />
        )}
        {tab === 'configurator' && (
          <ConfiguratorTab
            config={effectiveConfig}
            slots={slots}
            entities={entities}
            batteryLevel={batteryLevel}
            isPanel={isPanel}
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
