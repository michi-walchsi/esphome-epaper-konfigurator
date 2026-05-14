import { useState, useMemo, useEffect, useCallback } from 'react';
import './App.css';
import { DISPLAYS, BOARDS } from './utils/displays';
import { DEMO_ENTITIES, fetchHAEntities } from './utils/entities';
import { generateYaml } from './utils/yamlGenerator';
import ConfigPanel from './components/ConfigPanel';
import SlotManager from './components/SlotManager';
import YamlPreview from './components/YamlPreview';
import LivePreview from './components/LivePreview';

const INIT_CONFIG = {
  title:           'Mein Dashboard',
  deviceName:      'epaper-display',
  displayName:     'E-Paper Display',
  board:           BOARDS[0],
  display:         DISPLAYS[0],
  customWidth:     800,
  customHeight:    480,
  spiPins:         { cs: 'GPIO5', dc: 'GPIO17', rst: 'GPIO16', busy: 'GPIO4', clk: 'GPIO18', mosi: 'GPIO23' },
  deepSleep:       30,
  updateInterval:  60,
  gridCols:        3,
  batteryEntityId: '',
};

const INIT_SLOTS = [
  { id: '1', title: 'Temperatur',       unit: '°C',  entityId: 'sensor.temperature_living_room', size: 'small'  },
  { id: '2', title: 'Luftfeuchtigkeit', unit: '%',   entityId: 'sensor.humidity_living_room',    size: 'small'  },
  { id: '3', title: 'CO₂',             unit: 'ppm', entityId: 'sensor.co2_living_room',          size: 'medium' },
  { id: '4', title: 'Helligkeit',       unit: 'lx',  entityId: 'sensor.illuminance',              size: 'small'  },
];

export default function App() {
  const [config,       setConfig]       = useState(INIT_CONFIG);
  const [slots,        setSlots]        = useState(INIT_SLOTS);
  const [tab,          setTab]          = useState('config');
  const [entities,     setEntities]     = useState(DEMO_ENTITIES);
  const [haStatus,     setHaStatus]     = useState('idle'); // idle|loading|ok|error|hacs
  const [haConnection, setHaConnection] = useState(() => ({
    mode:  'demo',
    url:   localStorage.getItem('ha_url')   || 'http://homeassistant.local:8123',
    token: localStorage.getItem('ha_token') || '',
  }));

  // ── Signal readiness to HACS parent + receive hass states ──
  useEffect(() => {
    // Tell the parent HACS card we're ready to receive states
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'esphome-card-ready' }, '*');
    }
    const handler = event => {
      if (event.data?.type === 'hass-states') {
        const list = Object.values(event.data.states)
          .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
        setEntities(list);
        setHaConnection(p => ({ ...p, mode: 'ha' }));
        setHaStatus('hacs');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const connectToHA = useCallback(async () => {
    if (!haConnection.url || !haConnection.token) return;
    setHaStatus('loading');
    try {
      const data = await fetchHAEntities(haConnection.url, haConnection.token);
      setEntities(data.sort((a, b) => a.entity_id.localeCompare(b.entity_id)));
      setHaStatus('ok');
      setHaConnection(p => ({ ...p, mode: 'ha' }));
      localStorage.setItem('ha_url',   haConnection.url);
      localStorage.setItem('ha_token', haConnection.token);
    } catch {
      setHaStatus('error');
    }
  }, [haConnection.url, haConnection.token]);

  const switchToDemo = useCallback(() => {
    setEntities(DEMO_ENTITIES);
    setHaStatus('idle');
    setHaConnection(p => ({ ...p, mode: 'demo' }));
  }, []);

  const effectiveDisplay = useMemo(() => config.display.isCustom
    ? { ...config.display, width: config.customWidth, height: config.customHeight }
    : config.display,
    [config.display, config.customWidth, config.customHeight]
  );

  const effectiveConfig = useMemo(
    () => ({ ...config, display: effectiveDisplay }),
    [config, effectiveDisplay]
  );

  const yaml = useMemo(() => generateYaml(effectiveConfig, slots), [effectiveConfig, slots]);

  // ── Battery value from entities ──
  const batteryLevel = useMemo(() => {
    if (!config.batteryEntityId) return null;
    const e = entities.find(en => en.entity_id === config.batteryEntityId);
    const v = e ? parseFloat(e.state) : NaN;
    return isNaN(v) ? null : v;
  }, [config.batteryEntityId, entities]);

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">⊡</div>
          <div>
            <h1>ESPHome e-Paper Konfigurator</h1>
            <p>Visueller Dashboard-Generator · alle e-Paper Displays</p>
          </div>
        </div>
        <div className="app-header-right">
          {batteryLevel !== null && (
            <BatteryIndicator level={batteryLevel} />
          )}
          {haStatus === 'ok' && (
            <span className="badge badge-ha">🔗 HA · {entities.length} Entitäten</span>
          )}
          {haStatus === 'hacs' && (
            <span className="badge badge-ha">🏠 HACS · {entities.length} Entitäten</span>
          )}
          <span className="badge badge-accent">{effectiveDisplay.width}×{effectiveDisplay.height}</span>
          <span className="badge badge-muted">{config.board.name}</span>
        </div>
      </header>

      <div className="app-body">
        {/* ── Sidebar ── */}
        <aside className="app-sidebar">
          <div className="tab-bar">
            <button className={`tab-btn${tab === 'config' ? ' active' : ''}`} onClick={() => setTab('config')}>
              Konfiguration
            </button>
            <button className={`tab-btn${tab === 'yaml' ? ' active' : ''}`} onClick={() => setTab('yaml')}>
              YAML Vorschau
            </button>
          </div>

          <div className="tab-content">
            {tab === 'config' && (
              <>
                <ConfigPanel
                  config={config}
                  onChange={setConfig}
                  entities={entities}
                  haConnection={haConnection}
                  setHaConnection={setHaConnection}
                  haStatus={haStatus}
                  onConnect={connectToHA}
                  onDemo={switchToDemo}
                />
                <SlotManager slots={slots} onChange={setSlots} entities={entities} />
              </>
            )}
            {tab === 'yaml' && (
              <YamlPreview yaml={yaml} deviceName={config.deviceName} />
            )}
          </div>
        </aside>

        {/* ── Live Preview ── */}
        <main className="app-preview">
          <LivePreview
            config={effectiveConfig}
            slots={slots}
            entities={entities}
            batteryLevel={batteryLevel}
          />
        </main>
      </div>
    </div>
  );
}

function BatteryIndicator({ level }) {
  const color = level < 20 ? '#f85149' : level < 50 ? '#d29922' : '#3fb950';
  return (
    <div className="batt-indicator" style={{ '--batt-color': color, '--batt-fill': `${level}%` }}>
      <div className="batt-body"><div className="batt-fill" /></div>
      <div className="batt-cap" />
      <span className="batt-pct">{Math.round(level)}%</span>
    </div>
  );
}
