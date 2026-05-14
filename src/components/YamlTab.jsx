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
      <pre className="yaml-code">{highlight(yaml)}</pre>
    </div>
  );
}

// Simple YAML syntax highlighting via span injection — returns JSX
function highlight(text) {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    const trimmed = line.trimStart();
    let color = '#e6edf3';

    if (trimmed.startsWith('#'))           color = '#8b949e'; // comment
    else if (/^[a-z_]+:/.test(trimmed))    color = '#79c0ff'; // key
    else if (/^\s*-\s+platform:/.test(line)) color = '#a371f7'; // platform

    return (
      <span key={i} style={{ color, display: 'block' }}>{line}{'\n'}</span>
    );
  });
}
