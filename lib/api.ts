import 'server-only';
export async function upstream(path: string, init: RequestInit = {}) {
  const key = process.env.MANAGEMENT_API_KEY;
  if (!key) throw new Error('Falta configurar la conexión de gestión.');
  return fetch(`${(process.env.API_BASE_URL || 'http://localhost:4000/api').replace(/\/$/, '')}/${path}`, {
    ...init, cache: 'no-store', signal: AbortSignal.timeout(12_000),
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
  });
}
export function error(message: string, status: number) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}
