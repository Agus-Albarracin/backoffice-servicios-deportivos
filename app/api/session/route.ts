import { cookies } from 'next/headers';
import { allowAttempt, cookieName, createSession, getSession, revokeSession, sameOrigin, sessionSeconds, verifyPassword } from '@/lib/auth';
import { configurationIssues } from '@/lib/auth-config';
import { error } from '@/lib/api';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Origen no permitido.', 403);
  const issues = configurationIssues();
  if (issues.length) return error(`Configuración administrativa incompleta: ${issues.join('; ')}. Revisá las variables del backoffice en Production y volvé a desplegar.`, 503);
  if (!allowAttempt()) return error('Demasiados intentos. Esperá un minuto.', 429);
  const raw = await request.text();
  if (raw.length > 4096) return error('Solicitud demasiado grande.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { return error('Solicitud inválida.', 400); }
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || body.password.length > 512 || !verifyPassword(body.username, body.password)) return error('Usuario o contraseña incorrectos.', 401);
  let token: string;
  try { token = await createSession(body.username); }
  catch { return error('No se pudo guardar la sesión. Verificá que server tenga el soporte de sesiones y la migración 004, y que API_BASE_URL y MANAGEMENT_API_KEY sean correctos.', 503); }
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionSeconds });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return error('Origen no permitido.', 403);
  try {
    const session = await getSession();
    if (session) await revokeSession(session.id);
  } catch { return error('No se pudo cerrar la sesión en server. Reintentá.', 503); }
  (await cookies()).delete(cookieName);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
