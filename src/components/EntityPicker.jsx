import { useState, useEffect, useRef, useMemo } from 'react';
import { DOMAIN_META, formatState } from '../utils/entities';

const ALLOWED_DOMAINS = new Set([
  'sensor', 'binary_sensor', 'input_number', 'input_boolean', 'weather', 'sun',
]);

export default function EntityPicker({ entities, isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const relevant = useMemo(
    () => entities.filter(e => ALLOWED_DOMAINS.has(e.entity_id.split('.')[0])),
    [entities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return relevant.slice(0, 500);
    return relevant.filter(e =>
      e.entity_id.toLowerCase().includes(q) ||
      (e.attributes?.friendly_name?.toLowerCase() ?? '').includes(q)
    ).slice(0, 200);
  }, [relevant, query]);

  const grouped = useMemo(() => {
    const g = {};
    for (const e of filtered) {
      const domain = e.entity_id.split('.')[0];
      (g[domain] = g[domain] || []).push(e);
    }
    return g;
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="picker-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="picker-modal">
        <div className="picker-header">
          <div className="picker-search">
            <span className="picker-search-icon">🔍</span>
            <input
              ref={searchRef}
              className="picker-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`${relevant.length} Entitäten durchsuchen…`}
            />
            {query && (
              <button className="picker-clear" onClick={() => setQuery('')}>✕</button>
            )}
          </div>
          <button className="picker-close" onClick={onClose}>✕ Schließen</button>
        </div>

        <div className="picker-body">
          {Object.keys(grouped).length === 0 ? (
            <div className="picker-empty">
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
              Keine Entitäten gefunden für „{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([domain, items]) => {
              const meta = DOMAIN_META[domain] ?? { icon: '◈', label: domain, color: '#8b949e' };
              return (
                <div key={domain} className="picker-group">
                  <div className="picker-group-header" style={{ color: meta.color }}>
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="picker-group-count">{items.length}</span>
                  </div>
                  {items.map(entity => (
                    <button
                      key={entity.entity_id}
                      className="picker-entity"
                      onClick={() => { onSelect(entity); onClose(); }}
                    >
                      <span className="picker-entity-icon" style={{ color: meta.color }}>{meta.icon}</span>
                      <div className="picker-entity-info">
                        <span className="picker-entity-id">{entity.entity_id}</span>
                        {entity.attributes?.friendly_name && (
                          <span className="picker-entity-name">{entity.attributes.friendly_name}</span>
                        )}
                      </div>
                      <span className="picker-entity-state">{formatState(entity)}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <div className="picker-footer">
          {filtered.length} Entitäten · Klick oder Enter zum Übernehmen · Esc zum Schließen
        </div>
      </div>
    </div>
  );
}
