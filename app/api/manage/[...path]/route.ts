import { getSession, sameOrigin } from '@/lib/auth';
import { error, upstream } from '@/lib/api';
import { managementResponse } from '@/lib/upstream-response';
export const runtime = 'nodejs';
const resources = new Set(['sports', 'zones', 'venues', 'venue-sports', 'slots', 'booking-drafts']);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!(await getSession())) return error('La sesión venció. Volvé a ingresar.', 401);
  if (request.method !== 'GET' && !sameOrigin(request)) return error('Origen no permitido.', 403);
  const { path } = await context.params;
  if (!resources.has(path[0]) || path.length > 2 || (path[1] && !uuid.test(path[1]))) return error('Recurso inválido.', 404);
  if ((['PATCH', 'DELETE'].includes(request.method) && path.length !== 2) || (request.method === 'POST' && path.length !== 1)) return error('Operación inválida.', 405);
  const route = request.method === 'GET' && path.length === 1 ? `management/${path[0]}` : path.join('/');
  let body: string | undefined;
  if (['POST', 'PATCH'].includes(request.method)) {
    body = await request.text();
    if (Buffer.byteLength(body) > 16 * 1024) return error('Solicitud demasiado grande.', 413);
    try { const value = JSON.parse(body); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); } catch { return error('Datos inválidos.', 400); }
  }
  try {
    const response = await upstream(route, { method: request.method, body });
    return await managementResponse(response, request.method === 'GET' && path.length === 1);
  } catch { return error('No se pudo conectar con la API. Verificá que el servidor esté en funcionamiento y reintentá.', 503); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
