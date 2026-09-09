import 'server-only';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { configurationIssues } from './auth-config';

export const cookieName = 'turnero_admin';
export const sessionSeconds = 8 * 60 * 60;
const authGlobal = globalThis as typeof globalThis & { turneroAuth?: {
  sessions: Map<string, { username: string; expires: number }>;
  attempts: Map<string, { count: number; until: number }>;
} };
const state = authGlobal.turneroAuth ??= { sessions: new Map(), attempts: new Map() };
const { sessions, attempts } = state;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Configurá SESSION_SECRET con al menos 32 caracteres.');
  return value;
}
export function configured() {
  return configurationIssues().length === 0;
}
export function verifyPassword(username: string, password: string) {
  if (!configured()) return false;
  const [salt, hash] = process.env.ADMIN_PASSWORD_HASH!.split(':');
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex')) && username === process.env.ADMIN_USERNAME;
}
export function allowAttempt() {
  // Global per-process ceiling: do not trust spoofable forwarding headers.
  const key = 'login';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until <= now) { attempts.set(key, { count: 1, until: now + 60_000 }); return true; }
  entry.count++;
  return entry.count <= 10;
}
export function createSession(username: string) {
  const now = Date.now();
  for (const [id, item] of sessions) if (item.expires <= now) sessions.delete(id);
  if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value!);
  const id = randomBytes(32).toString('hex');
  sessions.set(id, { username, expires: now + sessionSeconds * 1000 });
  return `${id}.${createHmac('sha256', secret()).update(id).digest('hex')}`;
}
export async function getSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !configured()) return null;
  const [id, signature] = token.split('.');
  if (!/^[a-f0-9]{64}$/.test(id) || !/^[a-f0-9]{64}$/.test(signature ?? '')) return null;
  const expected = createHmac('sha256', secret()).update(id).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return null;
  const session = sessions.get(id);
  if (!session || session.expires <= Date.now()) { sessions.delete(id); return null; }
  return { ...session, id };
}
export function revokeSession(id: string) { sessions.delete(id); }
export function sameOrigin(request: Request) {
  const configuredOrigin = process.env.APP_ORIGIN;
  if (!configuredOrigin) return false;
  return request.headers.get('origin') === new URL(configuredOrigin).origin;
}
