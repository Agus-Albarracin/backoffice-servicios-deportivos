'use client';
import type { Dataset } from '@/lib/resources';

export type RequestFilterValues = { state: string; venueId: string; sportId: string; from: string; to: string };
export const emptyRequestFilters: RequestFilterValues = { state: '', venueId: '', sportId: '', from: '', to: '' };

export function RequestFilters({ value, data, change, clear }: { value: RequestFilterValues; data: Dataset; change: (value: RequestFilterValues) => void; clear: () => void }) {
  const invalidRange = Boolean(value.from && value.to && value.from > value.to);
  const update = (key: keyof RequestFilterValues, next: string) => change({ ...value, [key]: next });
  return <fieldset className="request-filters">
    <legend>Filtrar solicitudes</legend>
    <div className="request-filter-fields">
      <label>Estado de solicitud<select value={value.state} onChange={event => update('state', event.target.value)}>
        <option value="">Todos los estados</option><option value="PENDING">Pendientes</option><option value="RESERVATION_PAID">Pagó reserva</option><option value="TOTAL_PAID">Pagó total</option>
      </select></label>
      <label>Sede de solicitud<select value={value.venueId} onChange={event => update('venueId', event.target.value)}>
        <option value="">Todas las sedes</option>{data.venues.map(venue => <option key={venue.id} value={venue.id}>{String(venue.name)}</option>)}
      </select></label>
      <label>Deporte de solicitud<select value={value.sportId} onChange={event => update('sportId', event.target.value)}>
        <option value="">Todos los deportes</option>{data.sports.map(sport => <option key={sport.id} value={sport.id}>{String(sport.name)}</option>)}
      </select></label>
      <label>Fecha del turno desde<input type="date" value={value.from} max={value.to || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'request-date-error' : undefined} onChange={event => update('from', event.target.value)} /></label>
      <label>Fecha del turno hasta<input type="date" value={value.to} min={value.from || undefined} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'request-date-error' : undefined} onChange={event => update('to', event.target.value)} /></label>
      <button type="button" className="secondary" onClick={clear}>Limpiar filtros</button>
    </div>
    {invalidRange && <p id="request-date-error" role="alert">La fecha desde no puede ser posterior a la fecha hasta.</p>}
  </fieldset>;
}
