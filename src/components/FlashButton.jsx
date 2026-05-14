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

const delay = ms => new Promise(res => setTimeout(res, ms));

export default function FlashButton({ config, yaml, esphomeUrl, isDemo = false }) {
  const [phase, setPhase] = useState('idle');
  const [log,   setLog]   = useState('');
  const wsRef     = useRef(null);
  const abortRef  = useRef(null);
  const cancelRef = useRef(false);
  const logRef    = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const appendLog = line => setLog(prev => prev ? prev + '\n' + line : line);

  const cancel = () => {
    cancelRef.current = true;
    wsRef.current?.close();
    wsRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('idle');
    setLog('');
  };

  // ── Simulation mode (demo / no real ESPHome) ───────────────
  const simulateFlash = async () => {
    const name = config.deviceName || 'epaper-display';
    cancelRef.current = false;
    setPhase('saving');
    setLog('');

    await delay(600);
    if (cancelRef.current) return;
    appendLog(`✓ ${name}.yaml gespeichert (Demo-Simulation)`);

    setPhase('compiling');
    appendLog('INFO Compiling /config/esphome/...');
    await delay(700);
    if (cancelRef.current) return;
    appendLog('Compiling .pio/libdeps/esp32dev/ESPHome/src/esphome/core/application.cpp.o...');
    await delay(600);
    if (cancelRef.current) return;
    appendLog('Compiling .pio/build/esp32dev/src/main.cpp.o...');
    await delay(500);
    if (cancelRef.current) return;

    setPhase('linking');
    appendLog('Linking .pio/build/esp32dev/firmware.elf');
    await delay(400);
    if (cancelRef.current) return;
    appendLog('INFO Creating BIN file .pio/build/esp32dev/firmware.bin');
    await delay(300);
    if (cancelRef.current) return;

    setPhase('flashing');
    appendLog('INFO Uploading firmware (size: 1124256 bytes)...');
    for (let p = 0; p <= 100; p += 25) {
      await delay(300);
      if (cancelRef.current) return;
      appendLog(`INFO OTA in progress: ${p}%`);
    }
    await delay(400);
    if (cancelRef.current) return;

    setPhase('rebooting');
    appendLog('INFO Rebooting ESP...');
    await delay(900);
    if (cancelRef.current) return;

    appendLog(`INFO Successfully uploaded firmware to ${name}.local`);
    setPhase('done');
  };

  // ── Real flash via ESPHome API ─────────────────────────────
  const realFlash = async () => {
    const base = (esphomeUrl || 'http://homeassistant.local:6052').replace(/\/$/, '');
    const name = config.deviceName || 'epaper-display';

    cancelRef.current = false;
    setPhase('saving');
    setLog('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${base}/edit?configuration=${encodeURIComponent(name)}.yaml`, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    yaml,
        signal:  ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      appendLog(`✓ ${name}.yaml gespeichert`);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setPhase('error');
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        appendLog('✗ Verbindung zu ESPHome fehlgeschlagen.');
        appendLog('Prüfe ob ESPHome Add-on läuft und die URL korrekt ist.');
        appendLog('Tipp: im Demo-Modus den Flash-Button im Demo-Modus nutzen.');
      } else {
        appendLog(`✗ Fehler: ${err.message}`);
      }
      return;
    }

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
            if (/Compiling/i.test(line))                     setPhase('compiling');
            if (/Linking/i.test(line))                       setPhase('linking');
            if (/Uploading|OTA in progress/i.test(line))     setPhase('flashing');
            if (/Rebooting/i.test(line))                     setPhase('rebooting');
            if (/Successfully compiled|Successfully upload/i.test(line)) setPhase('done');
            if (/\[ERROR\]|Build failed/i.test(line))        setPhase('error');
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
        appendLog('WebSocket Fehler — prüfe ESPHome Verbindung.');
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

  const flash = () => isDemo ? simulateFlash() : realFlash();

  const { label, busy } = PHASES[phase] ?? PHASES.idle;
  const deepSleepActive = (config.deepSleep ?? 0) > 0;

  return (
    <div className="flash-section">
      {isDemo && phase === 'idle' && (
        <div className="flash-demo-badge">Demo-Modus — Flash wird simuliert</div>
      )}
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
          <button className="btn btn-danger" onClick={cancel} title="Abbrechen" style={{ padding: '0 14px' }}>✕</button>
        )}
      </div>
      {log && (
        <pre className="flash-log" ref={logRef}>{log}</pre>
      )}
    </div>
  );
}
