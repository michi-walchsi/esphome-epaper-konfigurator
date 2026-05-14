import { useState, useRef, useEffect } from 'react';

const PHASES = {
  idle:      { label: '🚀 Auf Gerät installieren',    busy: false },
  saving:    { label: '💾 Speichere YAML…',            busy: true  },
  compiling: { label: '⏳ Kompiliere…',                busy: true  },
  linking:   { label: '⏳ Linken…',                    busy: true  },
  flashing:  { label: '⚡ Flashe ESP…',                busy: true  },
  rebooting: { label: '🔄 ESP startet neu…',           busy: true  },
  done:      { label: '✅ Erfolgreich installiert!',   busy: false },
  error:     { label: '❌ Fehler aufgetreten',          busy: false },
};

export default function FlashButton({ config, yaml, esphomeUrl }) {
  const [phase, setPhase] = useState('idle');
  const [log,   setLog]   = useState('');
  const wsRef  = useRef(null);
  const logRef = useRef(null);

  // Auto-scroll log to bottom when new lines arrive
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const appendLog = line => setLog(prev => prev ? prev + '\n' + line : line);

  const cancel = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setPhase('idle');
    setLog('');
  };

  const flash = async () => {
    const base = (esphomeUrl || 'http://homeassistant.local:6052').replace(/\/$/, '');
    const name = config.deviceName || 'epaper-display';

    setPhase('saving');
    setLog('');

    // Step 1: Save YAML to ESPHome
    try {
      const res = await fetch(`${base}/edit?configuration=${encodeURIComponent(name)}.yaml`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: yaml,
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      appendLog(`✓ ${name}.yaml gespeichert`);
    } catch (err) {
      setPhase('error');
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        appendLog(`✗ Verbindung zu ESPHome fehlgeschlagen.`);
        appendLog(`Prüfe ob die URL korrekt ist und ob ESPHome Add-on läuft.`);
        appendLog(`Bei CORS-Fehlern: stelle sicher dass du über dieselbe Domain zugreifst.`);
      } else {
        appendLog(`✗ Fehler beim Speichern: ${err.message}`);
      }
      return;
    }

    // Step 2: Compile + Flash via WebSocket
    setPhase('compiling');
    appendLog('Starte Kompilierung…');

    const wsProto = base.startsWith('https') ? 'wss' : 'ws';
    const wsHost  = base.replace(/^https?:\/\//, '');
    const wsUrl   = `${wsProto}://${wsHost}/logs?configuration=${encodeURIComponent(name)}.yaml&type=upload`;

    let timeoutId = null;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPhase('error');
        appendLog('⏱ Timeout — keine Antwort von ESPHome nach 60 Sekunden.');
        wsRef.current?.close();
      }, 60_000);
    };

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      resetTimeout();

      ws.onmessage = event => {
        resetTimeout();
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'line') {
            const line = (msg.data ?? '').trim();
            if (line) appendLog(line);

            // Phase detection from ESPHome log output
            if (/Compiling/i.test(line))                    setPhase('compiling');
            if (/Linking/i.test(line))                      setPhase('linking');
            if (/Uploading|OTA in progress/i.test(line))    setPhase('flashing');
            if (/Rebooting/i.test(line))                    setPhase('rebooting');
            if (/Successfully compiled|Successfully upload/i.test(line)) setPhase('done');
            if (/\[ERROR\]|Build failed/i.test(line))       setPhase('error');
          }
          if (msg.event === 'exit') {
            clearTimeout(timeoutId);
            setPhase(msg.code === 0 ? 'done' : 'error');
            if (msg.code !== 0) appendLog(`✗ Prozess beendet mit Code ${msg.code}`);
            ws.close();
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onerror = () => {
        clearTimeout(timeoutId);
        setPhase('error');
        appendLog('WebSocket Fehler — prüfe ESPHome Verbindung und CORS-Einstellungen.');
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        wsRef.current = null;
      };
    } catch (err) {
      clearTimeout(timeoutId);
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
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="flash-btn" onClick={flash} disabled={busy} style={{ flex: 1 }}>
          {label}
        </button>
        {busy && (
          <button className="btn btn-danger" onClick={cancel} title="Abbrechen">✕</button>
        )}
      </div>
      {log && (
        <pre className="flash-log" ref={logRef}>{log}</pre>
      )}
    </div>
  );
}
