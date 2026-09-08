export interface CalendarSettings { calendarEnabled: boolean }
export interface Schedule { id: string; venueId: string; sportId: string; isActive: boolean; weekdays: number; opensAt: string; closesAt: string; durationMinutes: number; horizonDays: number }
export interface BlockedDay { id: string; venueId: string; date: string; reason: string }
export interface CalendarDay { date: string; availableCount: number; blocked: boolean }
export async function schedulingApi<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch('/api/scheduling/' + path, { method, signal, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(' · ') : data.message || 'No se pudo guardar la configuración.');
  return data;
}
