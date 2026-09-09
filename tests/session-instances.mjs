// Regression for serverless deployments: two separate Next processes share the
// fixture API, which stands in for the server's durable session repository.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { scryptSync } from 'node:crypto';

const root = new URL('../', import.meta.url);
const children = [];
function start(args, env = {}) {
  const child = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: 'ignore', env: { ...process.env, ...env } });
  children.push(child);
  return child;
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (child.exitCode !== null) throw new Error('Fixture process exited before readiness');
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Fixture readiness timeout');
}
const first = 'http://localhost:3301';
const second = 'http://localhost:3302';
const salt = '1'.repeat(32);
const password = 'instance-test-password';
const env = {
  NODE_ENV: 'production',
  API_BASE_URL: 'http://127.0.0.1:4401/api',
  MANAGEMENT_API_KEY: 'fixture-management-key',
  ADMIN_USERNAME: 'admin-fixture',
  ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  SESSION_SECRET: 'instance-test-secret-'.repeat(3),
};
try {
  const fixture = start(['tests/mock-api.mjs']);
  await ready('http://127.0.0.1:4401/health', fixture);
  for (const [url, port] of [[first, '3301'], [second, '3302']]) {
    const child = start(['node_modules/next/dist/bin/next', 'start', '-p', port], { ...env, APP_ORIGIN: url });
    await ready(`${url}/login`, child);
  }
  const login = () => fetch(`${first}/api/session`, {
    method: 'POST', headers: { Origin: first, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: env.ADMIN_USERNAME, password }),
  });
  const response = await login();
  assert.equal(response.status, 200);
  const setCookie = response.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  const cookie = setCookie.split(';')[0];
  const other = await fetch(`${second}/`, { headers: { Cookie: cookie }, redirect: 'manual' });
  assert.equal(other.status, 200, 'Another instance must accept the session');
  assert.match(await other.text(), /admin-fixture/);
  const tampered = await fetch(`${second}/api/manage/sports`, { headers: { Cookie: cookie + 'invalid' } });
  assert.equal(tampered.status, 401);
  const logout = await fetch(`${second}/api/session`, { method: 'DELETE', headers: { Cookie: cookie, Origin: second } });
  assert.equal(logout.status, 204);
  const replay = await fetch(`${first}/api/manage/sports`, { headers: { Cookie: cookie } });
  assert.equal(replay.status, 401, 'Revocation must apply to the original instance');
  await fetch('http://127.0.0.1:4401/simulate-sessions-unavailable');
  const unavailable = await login();
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('set-cookie'), null);
  console.log('PASS: cross-instance login, signed cookie, shared revocation and fail-closed API outage.');
} finally {
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
}
