import { useState } from 'react';

export default function YamlPreview({ yaml, deviceName }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
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
    <div className="yaml-panel">
      <div className="yaml-toolbar">
        <span className="yaml-filename">{deviceName || 'esphome'}.yaml</span>
        <div className="yaml-actions">
          <button className="yaml-btn" onClick={copy}>
            {copied ? '✓ Kopiert!' : '⧉ Kopieren'}
          </button>
          <button className="yaml-btn primary" onClick={download}>↓ Download</button>
        </div>
      </div>
      <pre className="yaml-code">{yaml}</pre>
    </div>
  );
}
