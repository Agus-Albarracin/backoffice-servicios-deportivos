import { getSession, sameOrigin } from '@/lib/auth';
import { error, upstream } from '@/lib/api';
import { managementResponse } from '@/lib/upstream-response';
export const runtime = 'nodejs';
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!(await getSession())) return error('La sesión venció. Volvé a ingresar al panel.', 401);
  if (request.method !== 'GET' && !sameOrigin(request)) return error('Origen no permitido.', 403);
  const { path } = await context.params;
  const endpoint = path[0];
  const allowed: Record<string, string[]> = { settings: ['GET', 'PATCH'], schedules: ['GET', 'POST'], 'blocked-days': ['GET', 'POST', 'DELETE'], month: ['GET'], day: ['GET'] };
  if (!allowed[endpoint]?.includes(request.method) || path.length > 2) return error('Operación inválida.', 404);
  const deleting = request.method === 'DELETE';
  if (deleting ? (endpoint !== 'blocked-days' || path.length !== 2 || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(path[1])) : path.length !== 1) return error('Recurso inválido.', 404);
  const query = new URLSearchParams();
  if (endpoint === 'month' || endpoint === 'day') {
    const input = new URL(request.url).searchParams;
    for (const key of ['venueId', 'sportId', endpoint === 'month' ? 'month' : 'date']) if (input.has(key)) query.set(key, input.get(key)!);
  }
  let body: string | undefined;
  if (['PATCH', 'POST'].includes(request.method)) {
    body = await request.text();
    if (Buffer.byteLength(body) > 16384) return error('Datos demasiado extensos.', 413);
    try { const parsed = JSON.parse(body); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); } catch { return error('Datos inválidos.', 400); }
  }
  try {
    const route = 'scheduling/' + path.join('/');
    const response = await upstream(route + (query.size ? '?' + query : ''), { method: request.method, body });
    if (response.status === 404) return error('Actualizá la API para habilitar la configuración de calendario.', 502);
    return await managementResponse(response, request.method === 'GET' && endpoint !== 'settings');
  } catch { return error('No se pudo conectar con la API de calendario. Reintentá.', 503); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
