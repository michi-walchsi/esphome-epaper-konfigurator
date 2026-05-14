export default function DevicesTab({ devices, esphomeStatus, esphomeUrl, onUrlChange, onRefresh, onOpen, onDelete, onNew }) {
  const dotColor = { idle: '#484f58', loading: '#d29922', ok: '#3fb950', error: '#f85149' }[esphomeStatus] ?? '#484f58';

  return (
    <div className="devices-tab">
      <div className="devices-header">
        <div className="devices-header-left">
          <h2>🖥 Geräte</h2>
          <div className="esphome-url-row">
            <span className="esphome-conn-dot" style={{ color: dotColor }}>●</span>
            <input
              value={esphomeUrl}
              onChange={e => onUrlChange(e.target.value)}
              placeholder="http://homeassistant.local:6052"
              spellCheck={false}
            />
            <button className="btn btn-ghost" onClick={onRefresh} title="Verbindung prüfen">↺ Prüfen</button>
          </div>
        </div>
        <div className="devices-header-right">
          <button className="btn btn-primary" onClick={onNew}>+ Neues Gerät</button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="devices-empty">
          <div className="devices-empty-icon">🖥</div>
          <h3>Noch keine Geräte konfiguriert</h3>
          <p>
            Klicke auf <strong>+ Neues Gerät</strong> um ein e-Paper Display zu konfigurieren.<br />
            Alle gespeicherten Konfigurationen erscheinen hier.
          </p>
          <br />
          {esphomeStatus === 'error' && (
            <p style={{ color: '#f85149', fontSize: 12 }}>
              ⚠ ESPHome nicht erreichbar unter {esphomeUrl}<br />
              Prüfe ob ESPHome Add-on läuft und die URL korrekt ist.
            </p>
          )}
        </div>
      ) : (
        <div className="devices-grid">
          {devices.map(device => (
            <DeviceCard
              key={device.name}
              device={device}
              onOpen={() => onOpen(device)}
              onDelete={() => onDelete(device.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, onOpen, onDelete }) {
  const savedAt = device.savedAt
    ? new Date(device.savedAt).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const hasDeepSleep = device.config?.deepSleep > 0;
  const statusClass  = hasDeepSleep ? 'sleep' : 'online';
  const statusLabel  = hasDeepSleep ? '💤 Deep Sleep' : '● Online';

  return (
    <div className="device-card" onClick={onOpen}>
      <div className="device-card-header">
        <div>
          <div className="device-name">{device.displayName || device.name}</div>
          <div className="device-display">{device.display} · {device.board}</div>
        </div>
        <span className={`device-status-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="device-meta">
        <div className="device-meta-item">
          <span className="device-meta-label">Name: </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{device.name}</span>
        </div>
        <div className="device-meta-item">
          <span className="device-meta-label">Gespeichert: </span>
          {savedAt}
        </div>
        {device.config?.batteryEntityId && (
          <div className="device-meta-item">
            <span className="device-meta-label">Batterie: </span>
            {device.config.batteryEntityId}
          </div>
        )}
      </div>

      <div className="device-card-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onOpen}>⚙ Bearbeiten</button>
        <button className="btn btn-danger" onClick={onDelete}>✕</button>
      </div>
    </div>
  );
}
