import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SLOT_SIZES } from '../utils/displays';
import EntityPicker from './EntityPicker';
import { IcoGrid, IcoX, IcoChevDown, IcoChevUp, IcoPlus } from './Icons';

function SortableSlot({ slot, index, onUpdate, onDelete, entities }) {
  const [open,        setOpen]        = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? .5 : 1 };
  const sizeLabel = SLOT_SIZES.find(s => s.id === slot.size)?.label ?? 'Small (1×1)';

  const handleEntitySelect = entity => {
    onUpdate(slot.id, 'entityId', entity.entity_id);
    if (entity.attributes?.unit_of_measurement)
      onUpdate(slot.id, 'unit', entity.attributes.unit_of_measurement);
    if ((!slot.title || slot.title === 'Neuer Slot') && entity.attributes?.friendly_name) {
      onUpdate(slot.id, 'title', entity.attributes.friendly_name);
    }
    setPickerOpen(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={`slot-item${isDragging ? ' dragging' : ''}`}>
      <div className="slot-header">
        <span className="slot-drag" {...attributes} {...listeners} aria-label="Ziehen zum Sortieren" title="Ziehen zum Sortieren">⠿⠿</span>
        <span className="slot-num">#{index + 1}</span>
        <button className="slot-toggle" onClick={() => setOpen(o => !o)}>
          <span className="slot-toggle-name">{slot.title || `Slot ${index + 1}`}</span>
          <span className="slot-size-badge">{sizeLabel}</span>
          {open ? <IcoChevUp size={11} className="slot-chevron" /> : <IcoChevDown size={11} className="slot-chevron" />}
        </button>
        <button className="slot-delete" onClick={() => onDelete(slot.id)} aria-label="Slot löschen" title="Slot löschen">
          <IcoX size={13} />
        </button>
      </div>

      {open && (
        <div className="slot-body">
          <div className="form-group">
            <label>Titel</label>
            <input value={slot.title} onChange={e => onUpdate(slot.id, 'title', e.target.value)} placeholder="z.B. Temperatur" />
          </div>
          <div className="form-group">
            <label>HA Entity ID</label>
            <div className="entity-input-row">
              <input value={slot.entityId} onChange={e => onUpdate(slot.id, 'entityId', e.target.value)} placeholder="sensor.temperature" />
              <button className="entity-pick-btn" onClick={() => setPickerOpen(true)} aria-label="Entity auswählen" title="Entity auswählen">
                <IcoGrid size={14} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Einheit</label>
            <input value={slot.unit} onChange={e => onUpdate(slot.id, 'unit', e.target.value)} placeholder="°C" />
          </div>
          <div className="form-group">
            <label>Größe</label>
            <div className="size-grid">
              {SLOT_SIZES.map(sz => (
                <button
                  key={sz.id}
                  className={`size-btn${slot.size === sz.id ? ' active' : ''}`}
                  onClick={() => onUpdate(slot.id, 'size', sz.id)}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <EntityPicker
          entities={entities}
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleEntitySelect}
        />
      )}
    </div>
  );
}

export default function SlotEditor({ slots, onChange, entities }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addSlot   = () => { if (slots.length >= 16) return; onChange(prev => [...prev, { id: `${Date.now()}`, title: 'Neuer Slot', unit: '', entityId: '', size: 'small' }]); };
  const deleteSlot = id  => onChange(prev => prev.filter(s => s.id !== id));
  const updateSlot = (id, key, val) => onChange(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      onChange(prev => {
        const from = prev.findIndex(s => s.id === active.id);
        const to   = prev.findIndex(s => s.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  };

  return (
    <div className="slot-editor">
      <div className="slot-editor-header">
        <div className="slot-editor-title">Slots ({slots.length}/16)</div>
        <button className="add-slot-btn btn-icon-text" onClick={addSlot} disabled={slots.length >= 16}>
          <IcoPlus size={12} /> Slot
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="slot-list">
            {slots.map((slot, i) => (
              <SortableSlot key={slot.id} slot={slot} index={i} onUpdate={updateSlot} onDelete={deleteSlot} entities={entities} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {slots.length === 0 && (
        <div className="slot-empty">Noch keine Slots — klicke auf &ldquo;+ Slot&rdquo;</div>
      )}
    </div>
  );
}
