'use client';
import { DayPicker, TZDate } from '@daypicker/react';
import { es } from '@daypicker/react/locale';
import '@daypicker/react/style.css';
export const calendarZone = 'America/Argentina/Buenos_Aires';
export function calendarDate(value: string) { return new TZDate(value + 'T12:00:00-03:00', calendarZone); }
export function calendarKey(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: calendarZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function CalendarPicker({ date, month, onDate, onMonth, days, loading, admin = false }: { date: string; month: string; onDate: (date: string) => void; onMonth: (month: string) => void; days: { date: string; availableCount: number; blocked: boolean }[]; loading: boolean; admin?: boolean }) {
  const today = calendarKey(new Date());
  const available = days.filter(day => day.availableCount > 0).map(day => calendarDate(day.date));
  const blocked = days.filter(day => day.blocked).map(day => calendarDate(day.date));
  return <div className="schedule-calendar" aria-busy={loading}><label className="calendar-month-label">Mes del calendario<input type="month" value={month} min="2000-01" max="2200-12" onChange={event => { if (event.target.value) onMonth(event.target.value); }} /></label><DayPicker mode="single" required locale={es} timeZone={calendarZone} weekStartsOn={1} month={calendarDate(month + '-01')} onMonthChange={value => onMonth(calendarKey(value).slice(0, 7))} selected={date ? calendarDate(date) : undefined} onSelect={value => { if (value) onDate(calendarKey(value)); }} disabled={value => { const key = calendarKey(value); return key < today || loading || (!admin && !days.some(day => day.date === key && day.availableCount > 0 && !day.blocked)); }} modifiers={{ available, blocked }} modifiersClassNames={{ available: 'calendar-available', blocked: 'calendar-blocked' }} footer={loading ? 'Consultando disponibilidad…' : admin ? 'Seleccioná una fecha para ver horarios o bloquear el día completo.' : 'Los días marcados tienen horarios disponibles.'} /><p className="calendar-legend"><span>● Con horarios</span><span>⊘ Día bloqueado</span></p></div>;
}
