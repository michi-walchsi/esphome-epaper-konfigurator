import { useState, useRef, useEffect } from 'react';
import { IcoZap, IcoSave, IcoSettings, IcoRefresh, IcoCheck, IcoAlertCircle, IcoX } from './Icons';
import InstallModal from './InstallModal';
import { validateEsphomeUrl, sanitizeLogLine, validateYaml } from '../utils/security';

const PHASES = {
  idle:      { label: 'Auf Gerät installieren',  Icon: IcoZap,         busy: false, progress: 0   },
  saving:    { label: 'Speichere YAML…',           Icon: IcoSave,        busy: true,  progress: 10  },
  compiling: { label: 'Kompiliere…',               Icon: IcoSettings,    busy: true,  progress: 30  },
  linking:   { label: 'Linken…',                   Icon: IcoSettings,    busy: true,  progress: 62  },
  flashing:  { label: 'Flashe ESP…',              Icon: IcoZap,         busy: true,  progress: 75  },
  rebooting: { label: 'ESP startet neu…',          Icon: IcoRefresh,     busy: true,  progress: 92  },
  done:      { label: 'Erfolgreich installiert!',  Icon: IcoCheck,       busy: false, progress: 100 },
  error:     { label: 'Fehler aufgetreten',         Icon: IcoAlertCircle, busy: false, progress: 100 },
};

const delay = ms => new Promise(res => setTimeout(res, ms));

// Run an ESPHome WebSocket command. Resolves to true (exit 0) or false (error/cancel/timeout).
function runWs(url, initMsg, { onLine, onPhase, cancelRef, wsRef, phaseDetect, firstTimeoutMs = 30_000, idleTimeoutMs = 180_000 }) {
  return new Promise(resolve => {
    let timeoutId = null;
    let firstReceived = false;
    let settled = false;

    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      wsRef.current = null;
      resolve(ok);
    };

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (settled) return;
        onLine('⏱ Timeout — keine Antwort von ESPHome. Erster Build kann mehrere Minuten dauern.');
        onPhase('error');
        const ws = wsRef.current;
        settle(false);
        ws?.close();
      }, firstReceived ? idleTimeoutMs : firstTimeoutMs);
    };

    let ws;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;
    } catch (err) {
      onLine(`WebSocket Fehler: ${err.message}`);
      onPhase('error');
      settle(false);
      return;
    }

    resetTimeout();
    ws.onopen = () => { ws.send(JSON.stringify(initMsg)); };

    ws.onmessage = event => {
      if (settled || cancelRef.current) return;
      firstReceived = true;
      resetTimeout();
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'line') {
          const line = (msg.data ?? '').trim();
          if (line) {
            onLine(line);
            phaseDetect?.(line, onPhase);
          }
        }
        if (msg.event === 'exit') {
          const ok = msg.code === 0;
          if (!ok) {
            onLine(`✗ Prozess beendet mit Code ${msg.code}`);
            onPhase('error');
          }
          settle(ok);
          ws.close();
        }
      } catch { /* ignore non-JSON frames */ }
    };

    ws.onerror = () => {
      if (settled || cancelRef.current) return;
      onLine('WebSocket Fehler — prüfe ESPHome Verbindung.');
      onPhase('error');
      settle(false);
    };

    ws.onclose = () => {
      if (settled) return;
      if (!cancelRef.current) {
        onLine('⚡ Verbindung unterbrochen.');
        onPhase('error');
      }
      settle(false);
    };
  });
}

function detectCompilePhase(line, setPhase) {
  if (/Compiling/i.test(line))              setPhase('compiling');
  if (/Linking/i.test(line))               setPhase('linking');
  if (/\[ERROR\]|Build failed/i.test(line)) setPhase('error');
}

function detectUploadPhase(line, setPhase) {
  if (/Uploading|OTA in progress|Connecting|Writing at/i.test(line)) setPhase('flashing');
  if (/Rebooting|Hard resetting/i.test(line))                        setPhase('rebooting');
  if (/Successfully upload/i.test(line))                             setPhase('done');
  if (/\[ERROR\]|Build failed/i.test(line))                         setPhase('error');
}

export default function FlashButton({ config, yaml, esphomeUrl, esphomeApiBase, isDemo = false }) {
  const [phase,     setPhase]     = useState('idle');
  const [log,       setLog]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const wsRef     = useRef(null);
  const abortRef  = useRef(null);
  const cancelRef = useRef(false);
  const logRef    = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => {
    return () => { wsRef.current?.close(); abortRef.current?.abort(); };
  }, []);

  const appendLog = line => setLog(prev => {
    const safe = sanitizeLogLine(line);
    return prev ? prev + '\n' + safe : safe;
  });

  const cancel = () => {
    cancelRef.current = true;
    wsRef.current?.close(); wsRef.current = null;
    abortRef.current?.abort(); abortRef.current = null;
    setPhase('idle');
    setLog('');
  };

  function handleClick() {
    if (isDemo) simulateFlash();
    else setShowModal(true);
  }

  function handleInstallConfirm({ method, port, configName }) {
    setShowModal(false);
    realFlash(method, port, configName);
  }

  // ── Demo simulation (dev mode only) ─────────────────────────
  async function simulateFlash() {
    const name = config.deviceName || 'epaper-display';
    cancelRef.current = false;
    setPhase('saving'); setLog('');

    await delay(600); if (cancelRef.current) return;
    appendLog(`✓ ${name}.yaml gespeichert (Demo-Simulation)`);
    setPhase('compiling');
    appendLog('INFO Kompiliere — Schritt 1/2 (erster Build: 2–5 Minuten)…');
    await delay(700); if (cancelRef.current) return;
    appendLog('Compiling .pio/libdeps/esp32dev/ESPHome/src/esphome/core/application.cpp.o...');
    await delay(600); if (cancelRef.current) return;
    appendLog('Compiling .pio/build/esp32dev/src/main.cpp.o...');
    await delay(500); if (cancelRef.current) return;
    setPhase('linking');
    appendLog('Linking .pio/build/esp32dev/firmware.elf');
    await delay(400); if (cancelRef.current) return;
    appendLog('INFO Creating BIN file .pio/build/esp32dev/firmware.bin');
    await delay(300); if (cancelRef.current) return;
    appendLog('✓ Kompilierung erfolgreich — starte Flash…');
    await delay(300); if (cancelRef.current) return;
    setPhase('flashing');
    appendLog('INFO Starte USB-Flash — Schritt 2/2…');
    appendLog('INFO Uploading firmware (size: 1124256 bytes)...');
    for (let p = 0; p <= 100; p += 25) {
      await delay(300); if (cancelRef.current) return;
      appendLog(`INFO OTA in progress: ${p}%`);
    }
    await delay(400); if (cancelRef.current) return;
    setPhase('rebooting');
    appendLog('INFO Rebooting ESP...');
    await delay(900); if (cancelRef.current) return;
    appendLog(`INFO Successfully uploaded firmware to ${name}.local`);
    setPhase('done');
  }

  // ── Real flash: compile first, then upload ───────────────────
  async function realFlash(method, port, configName) {
    // 1 — Resolve API base
    let base;
    if (esphomeApiBase) {
      base = esphomeApiBase;
    } else {
      try {
        base = validateEsphomeUrl(esphomeUrl);
      } catch (err) {
        setPhase('error'); setLog(`✗ ${err.message}`); return;
      }
    }

    // 2 — Basic YAML sanity check
    const { valid, issues } = validateYaml(yaml);
    if (!valid) {
      setPhase('error');
      setLog('✗ YAML-Validierung fehlgeschlagen:\n' + issues.join('\n'));
      return;
    }

    const filename = `${configName}.yaml`;
    if (!/^[a-z0-9][a-z0-9_-]*\.yaml$/.test(filename)) {
      setPhase('error');
      setLog('✗ Ungültiger Konfigurationsname.');
      return;
    }

    cancelRef.current = false;
    setPhase('saving'); setLog('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // 3 — POST YAML to ESPHome /edit
    try {
      const res = await fetch(
        `${base}/edit?configuration=${encodeURIComponent(filename)}`,
        {
          method:      'POST',
          headers:     { 'Content-Type': 'text/plain' },
          body:        yaml,
          signal:      ctrl.signal,
          credentials: esphomeApiBase ? 'include' : 'same-origin',
        },
      );
      if (res.status === 401 || res.status === 403) {
        setPhase('error');
        appendLog('✗ ESPHome: Keine Berechtigung.');
        appendLog(`→ Bitte zuerst bei ESPHome einloggen: ${base}`);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      appendLog(`✓ ${filename} gespeichert`);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setPhase('error');
      appendLog(
        err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')
          ? '✗ Verbindung zu ESPHome fehlgeschlagen.\nPrüfe ob ESPHome Add-on läuft und die URL korrekt ist.'
          : `✗ Fehler: ${err.message}`,
      );
      return;
    }

    const wsProto = base.startsWith('https') ? 'wss' : 'ws';
    const wsHost  = base.replace(/^https?:\/\//, '');
    const wsOpts  = { onLine: appendLog, onPhase: setPhase, cancelRef, wsRef };

    // 4 — Compile via /compile WebSocket (waits for exit before proceeding)
    setPhase('compiling');
    appendLog('Kompiliere — bitte warten (erster Build: 2–5 Minuten)…');
    const compileOk = await runWs(
      `${wsProto}://${wsHost}/compile`,
      { type: 'spawn', configuration: filename },
      { ...wsOpts, phaseDetect: detectCompilePhase, firstTimeoutMs: 30_000, idleTimeoutMs: 180_000 },
    );

    if (!compileOk || cancelRef.current) return;

    // 5 — Upload via /upload WebSocket (only reached if compile succeeded)
    appendLog(`✓ Kompilierung erfolgreich — starte ${method === 'usb' ? 'USB-Flash' : 'OTA-Update'}…`);
    setPhase('flashing');
    const uploadOk = await runWs(
      `${wsProto}://${wsHost}/upload`,
      { type: 'spawn', configuration: filename, port },
      { ...wsOpts, phaseDetect: detectUploadPhase, firstTimeoutMs: 30_000, idleTimeoutMs: 120_000 },
    );

    if (!cancelRef.current && uploadOk) setPhase('done');
  }

  // ── Render ───────────────────────────────────────────────────
  const { label, Icon, busy, progress } = PHASES[phase] ?? PHASES.idle;
  const deepSleepActive = (config.deepSleep ?? 0) > 0;
  const progressColor = phase === 'error' ? 'var(--danger)' : phase === 'done' ? 'var(--success)' : 'var(--accent)';

  return (
    <div className="flash-section">
      {isDemo && phase === 'idle' && (
        <div className="flash-demo-badge">Demo-Modus — Flash wird simuliert</div>
      )}
      {deepSleepActive && phase === 'idle' && (
        <div className="flash-warning">
          Deep Sleep aktiv — OTA-Update wird beim nächsten Aufwachen installiert
        </div>
      )}

      {phase !== 'idle' && (
        <div className="flash-progress">
          <div className="flash-progress-bar" style={{ width: `${progress}%`, background: progressColor }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`flash-btn${phase === 'done' ? ' done' : phase === 'error' ? ' error' : ''}`}
          onClick={handleClick}
          disabled={busy}
          style={{ flex: 1 }}
        >
          <Icon size={16} style={{ flexShrink: 0 }} />
          {label}
        </button>
        {busy && (
          <button className="btn btn-danger btn-icon" onClick={cancel} aria-label="Abbrechen" title="Abbrechen">
            <IcoX size={14} />
          </button>
        )}
      </div>

      {log && <pre className="flash-log" ref={logRef}>{log}</pre>}

      {showModal && (
        <InstallModal
          config={config}
          esphomeUrl={esphomeUrl}
          esphomeApiBase={esphomeApiBase}
          deepSleepActive={deepSleepActive}
          onConfirm={handleInstallConfirm}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
