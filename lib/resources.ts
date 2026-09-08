export type Resource = 'sports' | 'zones' | 'venues' | 'venue-sports' | 'slots' | 'booking-drafts';
export type RecordData = { id: string; [key: string]: string | number | boolean | undefined };
export type Dataset = Record<Resource, RecordData[]>;
export type Field = { key: string; label: string; type?: 'text' | 'number' | 'textarea' | 'checkbox' | 'select' | 'datetime-local' | 'date' | 'tel'; options?: string[]; relation?: Resource; optional?: boolean; max?: number; min?: number };
export const definitions: Record<Resource, { title: string; singular: string; description: string; icon: string; fields: Field[]; columns: string[] }> = {
  sports: { title: 'Deportes', singular: 'deporte', description: 'El catálogo de actividades que ofrecés en tus sedes.', icon: '◉', columns: ['name', 'icon', 'isActive'], fields: [{ key: 'name', label: 'Nombre', max: 120 }, { key: 'icon', label: 'Ícono o emoji', max: 80 }, { key: 'isActive', label: 'Activo', type: 'checkbox' }] },
  zones: { title: 'Zonas', singular: 'zona', description: 'Organizá tus sedes por ubicación geográfica.', icon: '⌖', columns: ['name'], fields: [{ key: 'name', label: 'Nombre', type: 'select', options: ['CABA', 'SUR', 'NORTE', 'NOROESTE', 'OESTE'] }] },
  venues: { title: 'Sedes', singular: 'sede', description: 'Toda la información de tus espacios deportivos.', icon: '▦', columns: ['name', 'zoneId', 'address', 'isActive'], fields: [{ key: 'name', label: 'Nombre', max: 120 }, { key: 'zoneId', label: 'Zona', relation: 'zones' }, { key: 'address', label: 'Dirección', max: 250 }, { key: 'whatsappNumber', label: 'WhatsApp de la sede', type: 'tel' }, { key: 'latitude', label: 'Latitud', type: 'number', min: -90, max: 90 }, { key: 'longitude', label: 'Longitud', type: 'number', min: -180, max: 180 }, { key: 'description', label: 'Descripción', type: 'textarea', max: 2000 }, { key: 'isActive', label: 'Activa', type: 'checkbox' }] },
  'venue-sports': { title: 'Deportes por sede', singular: 'relación', description: 'Definí qué actividades están habilitadas en cada sede.', icon: '⇄', columns: ['venueId', 'sportId', 'isActive'], fields: [{ key: 'venueId', label: 'Sede', relation: 'venues' }, { key: 'sportId', label: 'Deporte', relation: 'sports' }, { key: 'isActive', label: 'Habilitada', type: 'checkbox' }] },
  slots: { title: 'Turnos', singular: 'turno', description: 'Gestioná horarios disponibles, bloqueados y pasados.', icon: '▤', columns: ['venueId', 'sportId', 'startsAt', 'endsAt', 'status'], fields: [{ key: 'venueId', label: 'Sede', relation: 'venues' }, { key: 'sportId', label: 'Deporte', relation: 'sports' }, { key: 'startsAt', label: 'Inicio · Buenos Aires', type: 'datetime-local' }, { key: 'endsAt', label: 'Fin · Buenos Aires', type: 'datetime-local' }, { key: 'status', label: 'Estado', type: 'select', options: ['AVAILABLE', 'UNAVAILABLE'] }] },
  'booking-drafts': { title: 'Solicitudes', singular: 'solicitud', description: 'Revisá fecha y horario y confirmá la solicitud para reservar el turno.', icon: '▧', columns: ['renterFirstName', 'renterLastName', 'renterPhone', 'venueId', 'sportId', 'date', 'bookingTime', 'status'], fields: [{ key: 'sportId', label: 'Deporte', relation: 'sports' }, { key: 'renterFirstName', label: 'Nombre', optional: true, max: 80 }, { key: 'renterLastName', label: 'Apellido', optional: true, max: 80 }, { key: 'renterPhone', label: 'Teléfono', type: 'tel', optional: true }, { key: 'zoneId', label: 'Zona', relation: 'zones', optional: true }, { key: 'venueId', label: 'Sede', relation: 'venues', optional: true }, { key: 'date', label: 'Fecha', type: 'date', optional: true }, { key: 'slotId', label: 'Turno', relation: 'slots', optional: true }] },
};
export const resourceNames = Object.keys(definitions) as Resource[];
export function emptyDataset(): Dataset { return { sports: [], zones: [], venues: [], 'venue-sports': [], slots: [], 'booking-drafts': [] }; }
export const labels: Record<string, string> = { name: 'Nombre', icon: 'Ícono', isActive: 'Estado', zoneId: 'Zona', venueId: 'Sede', sportId: 'Deporte', address: 'Dirección', startsAt: 'Inicio', endsAt: 'Fin', status: 'Estado', renterFirstName: 'Nombre', renterLastName: 'Apellido', renterPhone: 'Teléfono', date: 'Fecha', bookingTime: 'Horario' };
export function localInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (key: string) => parts.find(part => part.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
export function display(data: Dataset, key: string, value: RecordData[string]): string {
  if (value === undefined || value === '') return '—';
  const relation: Record<string, Resource> = { sportId: 'sports', zoneId: 'zones', venueId: 'venues', slotId: 'slots' };
  if (relation[key]) { const record = data[relation[key]].find(row => row.id === value); return record ? recordLabel(data, relation[key], record) : 'Registro no disponible'; }
  if (key === 'isActive') return value ? 'Activo' : 'Inactivo';
  if (key === 'status') return ({ AVAILABLE: 'Disponible', UNAVAILABLE: 'Bloqueado', RESERVED: 'Reservado', CONFIRMED: 'Confirmada', PENDING_CONFIRMATION: 'Pendiente' } as Record<string, string>)[String(value)] ?? String(value);
  if (key === 'startsAt' || key === 'endsAt') return formatDate(String(value));
  if (key === 'date') return String(value).split('-').reverse().join('/');
  return String(value);
}
export function recordLabel(data: Dataset, resource: Resource, row: RecordData): string {
  if (row.name) return String(row.name);
  if (resource === 'slots') return `${display(data, 'venueId', row.venueId)} · ${formatDate(String(row.startsAt))}`;
  if (resource === 'venue-sports') return `${display(data, 'venueId', row.venueId)} · ${display(data, 'sportId', row.sportId)}`;
  return [row.renterFirstName, row.renterLastName].filter(Boolean).join(' ') || 'Solicitud sin contacto';
}
export async function requestApi(resource: Resource, method = 'GET', body?: object, id?: string) {
  const response = await fetch(`/api/manage/${resource}${id ? `/${id}` : ''}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  // A full navigation discards all private client state after session expiration.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (response.status === 401) { window.location.assign('/login'); throw new Error('La sesión venció.'); }
  if (response.status === 204) return null;
  let result;
  try { result = await response.json(); } catch { throw new Error('No se pudo leer la respuesta del servidor.'); }
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(' · ') : result.message || 'No se pudo completar la operación.');
  return result;
}
