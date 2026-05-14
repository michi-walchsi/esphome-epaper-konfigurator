import { useState } from 'react';

export default function YamlTab({ yaml, deviceName }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const download = () => {
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${deviceName || 'esphome'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="yaml-tab">
      <div className="yaml-toolbar">
        <span className="yaml-filename">📄 {deviceName || 'esphome'}.yaml</span>
        <div className="yaml-actions">
          <button className="yaml-btn" onClick={copy}>
            {copied ? '✓ Kopiert!' : '📋 Kopieren'}
          </button>
          <button className="yaml-btn primary" onClick={download}>⬇ Download</button>
        </div>
      </div>
      <pre className="yaml-code">{highlightLines(yaml)}</pre>
    </div>
  );
}

function highlightLines(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const trimmed = line.trimStart();
    let color;
    if (trimmed.startsWith('#'))                       color = '#8b949e'; // Kommentar
    else if (/^[a-z_]+:/.test(trimmed))                color = '#79c0ff'; // Schlüssel
    else if (/^\s*-\s*platform:\s/.test(line))         color = '#a371f7'; // platform
    else if (/^\s*-\s*file:\s/.test(line))             color = '#a371f7'; // file
    else if (/^\s*-\s*id:\s/.test(line))               color = '#ffa657'; // id
    else if (/:\s*["']/.test(line))                    color = '#a5d6ff'; // Strings
    else if (/:\s*\d/.test(line))                      color = '#79c0ff'; // Zahlen
    else if (trimmed.startsWith('-'))                  color = '#e6edf3'; // List item
    else                                               color = '#e6edf3';

    return <span key={i} style={{ color, display: 'block' }}>{line}</span>;
  });
}
