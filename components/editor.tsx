'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { definitions, localInput, recordLabel, requestApi, type Dataset, type RecordData, type Resource } from '@/lib/resources';
export function Editor({ resource, record, data, close, saved }: { resource: Resource; record: RecordData | null; data: Dataset; close: () => void; saved: (row: RecordData) => void }) {
  const definition = definitions[resource];
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() => Object.fromEntries(definition.fields.map(field => [field.key, field.type === 'checkbox' ? (record?.[field.key] ?? true) as boolean : field.type === 'datetime-local' && record?.[field.key] ? localInput(String(record[field.key])) : String(record?.[field.key] ?? (field.key === 'status' ? 'AVAILABLE' : ''))])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  function change(key: string, value: string | boolean) {
    setValues(previous => {
      const next = { ...previous, [key]: value };
      if (resource === 'booking-drafts') {
        if (key === 'zoneId' || key === 'sportId') next.venueId = '';
        if (['zoneId', 'sportId', 'venueId', 'date'].includes(key)) next.slotId = '';
      }
      if (resource === 'slots' && key === 'venueId') next.sportId = '';
      return next;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setError('');
    const payload: Record<string, string | number | boolean> = {};
    for (const field of definition.fields) {
      const value = values[field.key];
      const original = field.type === 'datetime-local' && record?.[field.key] ? localInput(String(record[field.key])) : record?.[field.key];
      if (record && String(value) === String(original ?? '')) continue;
      if (field.optional && value === '') {
        const changed = (key: string) => String(values[key] ?? '') !== String(record?.[key] ?? '');
        const invalidated = field.key === 'venueId' ? ['sportId', 'zoneId'].some(changed) : field.key === 'slotId' && ['sportId', 'zoneId', 'venueId', 'date'].some(changed);
        if (record?.[field.key] && !invalidated) { setError(`La API no permite vaciar ${field.label.toLowerCase()}. Ingresá un nuevo valor.`); return; }
        continue;
      }
      payload[field.key] = field.type === 'number' ? Number(value) : field.type === 'datetime-local' ? `${value}:00-03:00` : value;
    }
    if (!Object.keys(payload).length) { close(); return; }
    if (resource === 'slots' && new Date(`${values.endsAt}:00-03:00`) <= new Date(`${values.startsAt}:00-03:00`)) { setError('El fin debe ser posterior al inicio.'); return; }
    setBusy(true);
    try { const result = await requestApi(resource, record ? 'PATCH' : 'POST', payload, record?.id); saved(result); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="editor" onCancel={event => { event.preventDefault(); if (!busy) close(); }}><form onSubmit={submit}><div className="dialog-heading"><div><span className="eyebrow">{definition.title}</span><h2>{record ? 'Editar' : 'Crear'} {definition.singular}</h2></div><button type="button" className="icon-button" aria-label="Cerrar formulario" disabled={busy} onClick={close}>×</button></div><p className="muted">{resource === 'slots' ? 'Los horarios se guardan en la zona de Buenos Aires (UTC−3).' : 'Completá los datos. Los campos opcionales están indicados.'}</p><fieldset disabled={busy} className="form-grid">{definition.fields.map(field => {
    let options = field.relation ? data[field.relation] : [];
    if (resource === 'slots' && field.key === 'sportId') options = options.filter(row => row.isActive && data['venue-sports'].some(relation => relation.venueId === values.venueId && relation.sportId === row.id && relation.isActive));
    if (resource === 'slots' && field.key === 'venueId') options = options.filter(row => row.isActive);
    if (resource === 'booking-drafts' && field.key === 'sportId') options = options.filter(row => row.isActive);
    if (resource === 'booking-drafts' && field.key === 'venueId') options = options.filter(row => row.isActive && row.zoneId === values.zoneId && data['venue-sports'].some(relation => relation.venueId === row.id && relation.sportId === values.sportId && relation.isActive));
    if (resource === 'booking-drafts' && field.key === 'slotId') options = options.filter(row => row.venueId === values.venueId && row.sportId === values.sportId && row.status === 'AVAILABLE' && localInput(String(row.startsAt)).slice(0, 10) === values.date && Date.parse(String(row.startsAt)) > Date.now());
    const current = field.relation && data[field.relation].find(row => row.id === values[field.key]);
    if (current && !options.some(row => row.id === current.id)) options = [current, ...options];
    const common = { id: field.key, name: field.key, required: !field.optional, value: String(values[field.key]), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => change(field.key, event.target.value) };
    return <label key={field.key} className={field.type === 'textarea' || field.type === 'checkbox' ? 'wide' : ''} htmlFor={field.key}>{field.type !== 'checkbox' && <span>{field.label}{field.optional && <small> · opcional</small>}</span>}{field.type === 'checkbox' ? <span className="checkbox"><input id={field.key} type="checkbox" checked={Boolean(values[field.key])} onChange={event => change(field.key, event.target.checked)} />{field.label}</span> : field.relation || field.options ? <select {...common}><option value="">Seleccionar…</option>{field.options?.map(option => <option key={option} value={option}>{option === 'AVAILABLE' ? 'Disponible' : option === 'UNAVAILABLE' ? 'Bloqueado' : option}</option>)}{options.map(row => <option key={row.id} value={row.id}>{recordLabel(data, field.relation!, row)}{row.isActive === false ? ' (inactivo)' : ''}</option>)}</select> : field.type === 'textarea' ? <textarea {...common} maxLength={field.max} rows={4} /> : <input {...common} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} min={field.type === 'number' ? field.min : undefined} max={field.type === 'number' ? field.max : undefined} maxLength={field.type !== 'number' ? field.max : undefined} pattern={field.type === 'tel' ? '\\+[1-9][0-9]{7,14}' : undefined} placeholder={field.type === 'tel' ? '+5491123456789' : undefined} />}</label>;
  })}</fieldset>{resource === 'booking-drafts' && <p className="notice">Cambiar deporte, zona, sede o fecha puede invalidar la selección anterior. Se conserva la respuesta validada por la API.</p>}{error && <p role="alert" className="notice error">{error}</p>}<footer className="dialog-footer"><button type="button" className="secondary" disabled={busy} onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></footer></form></dialog>;
}
