'use client';
import { useState, type FormEvent } from 'react';
import { schedulingApi, type Schedule } from '@/lib/scheduling';
export function ScheduleForm({ venueId, sportId, schedule, saved }: { venueId: string; sportId: string; schedule?: Schedule; saved: () => void }) {
  const [weekdays, setWeekdays] = useState(schedule?.weekdays ?? 127);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    if (!weekdays) { setError('Seleccioná al menos un día habitual.'); return; }
    const payload = { venueId, sportId, weekdays, isActive: form.has('isActive'), opensAt: String(form.get('opensAt')), closesAt: String(form.get('closesAt')), durationMinutes: Number(form.get('durationMinutes')), horizonDays: Number(form.get('horizonDays')) };
    if (payload.closesAt <= payload.opensAt) { setError('El cierre debe ser posterior a la apertura, dentro del mismo día.'); return; }
    setBusy(true); setError('');
    try { await schedulingApi('schedules', 'POST', payload); saved(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="schedule-form"><p>Definí el horario habitual una sola vez. Se ofrecerán turnos automáticamente; después solo necesitás bloquear las excepciones.</p><fieldset disabled={busy}><legend>Días habituales</legend><div className="weekdays">{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => <label key={day}><input type="checkbox" checked={Boolean(weekdays & (1 << index))} onChange={() => setWeekdays(value => value ^ (1 << index))} />{day}</label>)}</div><div className="form-grid"><label>Apertura<input type="time" name="opensAt" required defaultValue={schedule?.opensAt} /></label><label>Cierre<input type="time" name="closesAt" required defaultValue={schedule?.closesAt} /></label><label>Duración del turno (minutos)<input type="number" name="durationMinutes" min={15} max={720} required defaultValue={schedule?.durationMinutes} /></label><label>Cantidad de días a cubrir<input type="number" name="horizonDays" min={1} max={365} required defaultValue={schedule?.horizonDays ?? 90} /></label></div><label className="checkbox"><input type="checkbox" name="isActive" defaultChecked={schedule?.isActive ?? true} />Generar disponibilidad automáticamente</label><p className="muted">Hora de Buenos Aires. Una franja por día; los intervalos incompletos al cierre no se ofrecen. Desactivar conserva los registros anteriores.</p></fieldset>{error && <p role="alert" className="notice error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar horario habitual'}</button></form>;
}
