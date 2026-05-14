import { useState } from 'react';
import { IcoFile, IcoCopy, IcoCheck, IcoDownload } from './Icons';

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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="yaml-tab">
      <div className="yaml-toolbar">
        <span className="yaml-filename">
          <IcoFile size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {deviceName || 'esphome'}.yaml
        </span>
        <div className="yaml-actions">
          <button className="yaml-btn" onClick={copy}>
            {copied
              ? <><IcoCheck size={13} style={{ verticalAlign: 'middle' }} /> Kopiert!</>
              : <><IcoCopy size={13} style={{ verticalAlign: 'middle' }} /> Kopieren</>}
          </button>
          <button className="yaml-btn primary" onClick={download}>
            <IcoDownload size={13} style={{ verticalAlign: 'middle' }} /> Download
          </button>
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
    if (trimmed.startsWith('#'))                       color = '#8b949e';
    else if (/^[a-z_]+:/.test(trimmed))                color = '#79c0ff';
    else if (/^\s*-\s*platform:\s/.test(line))         color = '#a371f7';
    else if (/^\s*-\s*file:\s/.test(line))             color = '#a371f7';
    else if (/^\s*-\s*id:\s/.test(line))               color = '#ffa657';
    else if (/:\s*["']/.test(line))                    color = '#a5d6ff';
    else if (/:\s*\d/.test(line))                      color = '#79c0ff';
    else if (trimmed.startsWith('-'))                  color = '#e6edf3';
    else                                               color = '#e6edf3';

    return (
      <span key={i} style={{ display: 'flex', minHeight: '1.7em' }}>
        <span className="yaml-ln">{i + 1}</span>
        <span style={{ color, whiteSpace: 'pre' }}>{line || ' '}</span>
      </span>
    );
  });
}
