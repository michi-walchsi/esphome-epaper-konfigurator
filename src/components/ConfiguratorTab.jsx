import { useState } from 'react';
import { DISPLAYS, BOARDS } from '../utils/displays';
import EntityPicker from './EntityPicker';
import LivePreview  from './LivePreview';
import SlotEditor   from './SlotEditor';
import FlashButton  from './FlashButton';

export default function ConfiguratorTab({
  config, slots, entities, batteryLevel, isPanel, esphomeUrl, yaml, onChange, onSlotsChange, onSave,
}) {
  const [battPickerOpen, setBattPickerOpen] = useState(false);
  const set    = (key, val) => onChange(p => ({ ...p, [key]: val }));
  const setPin = (k, val)   => onChange(p => ({ ...p, spiPins: { ...p.spiPins, [k]: val } }));

  const isLilygo   = config.display.platform === 'lilygo_t5_47';
  const isCustom    = config.display.isCustom;

  return (
    <div className="configurator-layout">

      {/* ── Left: Config ── */}
      <div className="config-column">
        <div className="config-scroll">

          {/* ── Gerät ── */}
          <div className="section-card">
            <div className="section-title">Gerät &amp; Display</div>
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
            {isCustom && (
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
            <div className="section-card">
              <div className="section-title">SPI Pins</div>
              <div className="form-row">
                <div className="form-group"><label>CS</label>    <input value={config.spiPins.cs}   onChange={e => setPin('cs',   e.target.value)} /></div>
                <div className="form-group"><label>DC</label>    <input value={config.spiPins.dc}   onChange={e => setPin('dc',   e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Reset</label> <input value={config.spiPins.rst}  onChange={e => setPin('rst',  e.target.value)} /></div>
                <div className="form-group"><label>Busy</label>  <input value={config.spiPins.busy} onChange={e => setPin('busy', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>CLK</label>   <input value={config.spiPins.clk}  onChange={e => setPin('clk',  e.target.value)} /></div>
                <div className="form-group"><label>MOSI</label>  <input value={config.spiPins.mosi} onChange={e => setPin('mosi', e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* ── Timing & Grid ── */}
          <div className="section-card">
            <div className="section-title">Timing &amp; Grid</div>
            <div className="form-row">
              <div className="form-group">
                <label>Deep Sleep (Minuten)</label>
                <input type="number" value={config.deepSleep}      min={0}  max={1440} onChange={e => set('deepSleep',      +e.target.value)} />
              </div>
              <div className="form-group">
                <label>Update-Intervall (s)</label>
                <input type="number" value={config.updateInterval} min={10} max={3600} onChange={e => set('updateInterval', +e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Grid-Spalten</label>
              <div className="grid-btns">
                {[2, 3, 4, 5].map(n => (
                  <button key={n} className={`grid-btn${config.gridCols === n ? ' active' : ''}`} onClick={() => set('gridCols', n)}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Batterie ── */}
          <div className="section-card">
            <div className="section-title">Batterie-Status</div>
            <div className="form-group">
              <label>Batterie Entity ID</label>
              <div className="entity-input-row">
                <input
                  value={config.batteryEntityId}
                  onChange={e => set('batteryEntityId', e.target.value)}
                  placeholder="sensor.epaper_battery"
                />
                <button className="entity-pick-btn" onClick={() => setBattPickerOpen(true)}>⊞</button>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                0–20 % rot · 20–50 % gelb · 50–100 % grün
              </span>
            </div>
            {battPickerOpen && (
              <EntityPicker
                entities={entities}
                isOpen
                onClose={() => setBattPickerOpen(false)}
                onSelect={e => { set('batteryEntityId', e.entity_id); setBattPickerOpen(false); }}
              />
            )}
          </div>

          {/* ── WiFi ── */}
          <div className="section-card">
            <div className="section-title">WiFi (nur für YAML)</div>
            <div className="form-row">
              <div className="form-group">
                <label>SSID</label>
                <input value={config.wifiSsid || ''} onChange={e => set('wifiSsid', e.target.value)} placeholder="Netzwerkname (leer = !secret)" />
              </div>
              <div className="form-group">
                <label>Passwort</label>
                <input type="password" value={config.wifiPassword || ''} onChange={e => set('wifiPassword', e.target.value)} placeholder="Passwort" autoComplete="new-password" />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Leer lassen → <code style={{ fontFamily: 'var(--mono)' }}>!secret</code> wird ins YAML geschrieben.
            </p>
          </div>

          {/* ── Flash ── */}
          <div className="section-card">
            <div className="section-title">Auf Gerät installieren</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onSave}>💾 Konfiguration speichern</button>
            </div>
            <FlashButton config={config} yaml={yaml} esphomeUrl={esphomeUrl} />
          </div>

        </div>
      </div>

      {/* ── Right: Preview + Slots ── */}
      <div className="preview-column">
        <div className="preview-area">
          <LivePreview config={config} slots={slots} entities={entities} batteryLevel={batteryLevel} />
        </div>
        <div className="slot-area">
          <SlotEditor slots={slots} onChange={onSlotsChange} entities={entities} />
        </div>
      </div>

    </div>
  );
}
