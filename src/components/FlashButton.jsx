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

export default function FlashButton({ config, yaml, esphomeUrl, isDemo = false }) {
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
    return () => {
      wsRef.current?.close();
      abortRef.current?.abort();
    };
  }, []);

  // All log lines pass through sanitizeLogLine before being stored in state.
  // The log is rendered as text inside <pre>, so there is no XSS risk either way.
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

  // ── Button click ─────────────────────────────────────────────
  function handleClick() {
    if (isDemo) simulateFlash();
    else setShowModal(true);
  }

  // Called by InstallModal when the user confirms method + port
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
    appendLog('INFO Compiling /config/esphome/...');
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
    setPhase('flashing');
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

  // ── Real flash (panel mode) ──────────────────────────────────
  async function realFlash(method, port, configName) {
    // 1 — Validate ESPHome URL (must be http:// or https://)
    let base;
    try {
      base = validateEsphomeUrl(esphomeUrl);
    } catch (err) {
      setPhase('error'); setLog(`✗ ${err.message}`); return;
    }

    // 2 — Basic YAML sanity check before sending to ESPHome
    const { valid, issues } = validateYaml(yaml);
    if (!valid) {
      setPhase('error');
      setLog('✗ YAML-Validierung fehlgeschlagen:\n' + issues.join('\n'));
      return;
    }

    const filename = `${configName}.yaml`;
    cancelRef.current = false;
    setPhase('saving'); setLog('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // 3 — POST YAML to ESPHome /edit
    try {
      const res = await fetch(
        `${base}/edit?configuration=${encodeURIComponent(filename)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'text/plain' },
          body:    yaml,
          signal:  ctrl.signal,
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

    setPhase('compiling');
    appendLog(`Starte ${method === 'usb' ? 'USB-Flash' : 'OTA-Update'}…`);

    // 4 — WebSocket /upload — JSON-Init-Frame {type:"spawn", configuration, port}
    const wsProto = base.startsWith('https') ? 'wss' : 'ws';
    const wsHost  = base.replace(/^https?:\/\//, '');
    const wsUrl   = `${wsProto}://${wsHost}/upload`;

    let timeoutId = null;
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPhase('error');
        appendLog('⏱ Timeout — keine Antwort von ESPHome nach 60 Sekunden.');
        wsRef.current?.close();
      }, 60_000);
    };

    // Guard: filename must be safe before we open the socket
    if (!/^[a-z0-9][a-z0-9_-]*\.yaml$/.test(filename)) {
      setPhase('error');
      appendLog('✗ Ungültiger Konfigurationsname.');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      resetTimeout();
      let exited = false;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'spawn', configuration: filename, port }));
      };

      ws.onmessage = event => {
        if (cancelRef.current) return;
        resetTimeout();
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'line') {
            const line = (msg.data ?? '').trim();
            if (line) appendLog(line);
            if (/Compiling/i.test(line))                                setPhase('compiling');
            if (/Linking/i.test(line))                                  setPhase('linking');
            if (/Uploading|OTA in progress|Connecting to/i.test(line)) setPhase('flashing');
            if (/Rebooting/i.test(line))                                setPhase('rebooting');
            if (/Successfully compiled|Successfully upload/i.test(line)) setPhase('done');
            if (/\[ERROR\]|Build failed/i.test(line))                   setPhase('error');
          }
          if (msg.event === 'exit') {
            exited = true;
            clearTimeout(timeoutId);
            setPhase(msg.code === 0 ? 'done' : 'error');
            if (msg.code !== 0) appendLog(`✗ Prozess beendet mit Code ${msg.code}`);
            ws.close();
          }
        } catch { /* ignore non-JSON frames */ }
      };

      ws.onerror = () => {
        if (cancelRef.current) return;
        clearTimeout(timeoutId);
        setPhase('error');
        appendLog('WebSocket Fehler — prüfe ESPHome Verbindung.');
      };

      ws.onclose = () => {
        clearTimeout(timeoutId);
        wsRef.current = null;
        if (!exited && !cancelRef.current) {
          setPhase('error');
          appendLog('⚡ Verbindung unterbrochen.');
        }
      };
    } catch (err) {
      clearTimeout(timeoutId);
      setPhase('error');
      appendLog(`WebSocket Fehler: ${err.message}`);
    }
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
          deepSleepActive={deepSleepActive}
          onConfirm={handleInstallConfirm}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
