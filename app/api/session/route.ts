import { cookies } from 'next/headers';
import { allowAttempt, configured, cookieName, createSession, getSession, revokeSession, sameOrigin, sessionSeconds, verifyPassword } from '@/lib/auth';
import { error } from '@/lib/api';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return error('Origen no permitido.', 403);
  if (!configured()) return error('El acceso administrativo todavía no está configurado. Ejecutá npm run setup en backoffice.', 503);
  if (!allowAttempt()) return error('Demasiados intentos. Esperá un minuto.', 429);
  const raw = await request.text();
  if (raw.length > 4096) return error('Solicitud demasiado grande.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { return error('Solicitud inválida.', 400); }
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string' || body.password.length > 512 || !verifyPassword(body.username, body.password)) return error('Usuario o contraseña incorrectos.', 401);
  (await cookies()).set(cookieName, createSession(body.username), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: sessionSeconds });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return error('Origen no permitido.', 403);
  const session = await getSession();
  if (session) revokeSession(session.id);
  (await cookies()).delete(cookieName);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
