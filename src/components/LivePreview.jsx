import { useMemo } from 'react';
import { layoutSlots, getMaxRows } from '../utils/displays';

function BatteryPreview({ level }) {
  if (level === null) return null;
  const color = level < 20 ? '#f85149' : level < 50 ? '#d29922' : '#3fb950';
  return (
    <div className="preview-batt" style={{ '--pbatt-color': color, '--pbatt-fill': `${level}%` }}>
      <div className="preview-batt-body"><div className="preview-batt-fill" /></div>
      <div className="preview-batt-cap" />
      <span className="preview-batt-pct">{Math.round(level)}%</span>
    </div>
  );
}

export default function LivePreview({ config, slots, entities, batteryLevel }) {
  const { display, title, gridCols } = config;
  const { width, height } = display;

  const now     = new Date();
  const timeStr = now.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const layout  = useMemo(() => layoutSlots(slots, gridCols), [slots, gridCols]);
  const maxRows = useMemo(() => getMaxRows(layout),            [layout]);

  // Build entity state lookup map
  const entityMap = useMemo(() => {
    const map = {};
    for (const e of entities) map[e.entity_id] = e;
    return map;
  }, [entities]);

  const headerPct = 13;
  const isLive    = entities.length > 0 && entities !== entities; // always true but keeps intent

  return (
    <div className="preview-wrapper">
      <div className="preview-label">
        <span>Live-Vorschau</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {entities.some(e => e.entity_id.startsWith('sensor.temperature')) && entities[0]?.state !== '--' && (
            <span className="preview-live-badge">● Live</span>
          )}
          <span className="preview-res">{width} × {height}</span>
        </div>
      </div>

      <div className="preview-display" style={{ aspectRatio: `${width} / ${height}` }}>
        {/* ── Header ── */}
        <div className="preview-header" style={{ height: `${headerPct}%` }}>
          <span className="preview-title">{title}</span>
          <div className="preview-header-right">
            <BatteryPreview level={batteryLevel} />
            <span className="preview-time">{timeStr} · {dateStr}</span>
          </div>
        </div>

        {/* ── Slot grid ── */}
        <div
          className="preview-grid"
          style={{
            height: `${100 - headerPct}%`,
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows:    `repeat(${maxRows}, 1fr)`,
          }}
        >
          {layout.map(({ slot, size, col, row }) => {
            const entity = slot.entityId ? entityMap[slot.entityId] : null;
            const state  = entity?.state ?? null;
            const unit   = entity?.attributes?.unit_of_measurement || slot.unit || '';
            const isNumeric = state !== null && !isNaN(parseFloat(state));

            return (
              <div
                key={slot.id}
                className="preview-slot"
                style={{
                  gridColumn: `${col + 1} / span ${size.cols}`,
                  gridRow:    `${row + 1} / span ${size.rows}`,
                }}
              >
                <div className="preview-slot-title">{slot.title || '—'}</div>

                {slot.entityId ? (
                  <>
                    {state !== null ? (
                      <div className="preview-slot-value">
                        <span className="preview-value-num">
                          {isNumeric ? parseFloat(state).toLocaleString('de-AT', { maximumFractionDigits: 1 }) : state}
                        </span>
                        {unit && <span className="preview-value-unit">&thinsp;{unit}</span>}
                      </div>
                    ) : (
                      <div className="preview-slot-value">
                        <span className="preview-value-num" style={{ color: '#bbb' }}>--</span>
                        {slot.unit && <span className="preview-value-unit">&thinsp;{slot.unit}</span>}
                      </div>
                    )}
                    <div className="preview-slot-entity">{slot.entityId}</div>
                  </>
                ) : (
                  <div className="preview-no-entity">keine Entity</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
