import { useState, useRef } from 'react';

const PHASES = {
  idle:      { label: '🚀 Auf Gerät installieren',    busy: false },
  saving:    { label: '💾 Speichere YAML…',            busy: true  },
  compiling: { label: '⏳ Kompiliere YAML…',           busy: true  },
  flashing:  { label: '⚡ Flashe ESP…',                busy: true  },
  rebooting: { label: '🔄 ESP startet neu…',           busy: true  },
  done:      { label: '✅ Erfolgreich installiert!',   busy: false },
  error:     { label: '❌ Fehler aufgetreten',          busy: false },
};

export default function FlashButton({ config, yaml, esphomeUrl }) {
  const [phase, setPhase] = useState('idle');
  const [log,   setLog]   = useState('');
  const wsRef = useRef(null);

  const appendLog = line => setLog(prev => prev ? prev + '\n' + line : line);

  const flash = async () => {
    const base = (esphomeUrl || 'http://homeassistant.local:6052').replace(/\/$/, '');
    const name = config.deviceName || 'epaper-display';

    setPhase('saving');
    setLog('');

    // Step 1: Save YAML to ESPHome
    try {
      const res = await fetch(`${base}/edit?configuration=${encodeURIComponent(name)}.yaml`, {
        method: 'POST',
        body: yaml,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      appendLog(`✓ ${name}.yaml gespeichert`);
    } catch (err) {
      setPhase('error');
      appendLog(`✗ Fehler beim Speichern: ${err.message}`);
      appendLog('Prüfe ob ESPHome erreichbar ist und die CORS-Einstellungen korrekt sind.');
      return;
    }

    // Step 2: Compile + Flash via WebSocket
    setPhase('compiling');
    appendLog('Starte Kompilierung…');

    const wsProto = base.startsWith('https') ? 'wss' : 'ws';
    const wsHost  = base.replace(/^https?:\/\//, '');
    const wsUrl   = `${wsProto}://${wsHost}/logs?configuration=${encodeURIComponent(name)}.yaml&type=upload`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'line') {
            const line = msg.data || '';
            appendLog(line);
            if (/Compiling/i.test(line))    setPhase('compiling');
            if (/Linking|Uploading/i.test(line)) setPhase('flashing');
            if (/Rebooting/i.test(line))    setPhase('rebooting');
            if (/Successfully/i.test(line)) setPhase('done');
          }
          if (msg.event === 'exit') {
            setPhase(msg.code === 0 ? 'done' : 'error');
            ws.close();
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onerror = () => {
        if (phase !== 'done') {
          setPhase('error');
          appendLog('WebSocket Fehler — prüfe ESPHome Verbindung.');
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
      };
    } catch (err) {
      setPhase('error');
      appendLog(`WebSocket Fehler: ${err.message}`);
    }
  };

  const { label, busy } = PHASES[phase] ?? PHASES.idle;
  const deepSleepActive = (config.deepSleep ?? 0) > 0;

  return (
    <div className="flash-section">
      {deepSleepActive && phase === 'idle' && (
        <div className="flash-warning">
          ⏳ Deep Sleep aktiv — Update wird beim nächsten Aufwachen installiert (OTA konfiguriert)
        </div>
      )}
      <button className="flash-btn" onClick={flash} disabled={busy}>
        {label}
      </button>
      {log && (
        <pre className="flash-log">{log}</pre>
      )}
    </div>
  );
}
