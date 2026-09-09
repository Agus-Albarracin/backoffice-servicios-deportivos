// Explicit fixture API, isolated from MySQL. Backend rules are tested in server/test.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const resources = ['sports', 'zones', 'venues', 'venue-sports', 'slots', 'booking-drafts'];
let database = Object.fromEntries(resources.map(key => [key, []]));
let outdated = false;
let sessionsUnavailable = false;
let calendarSettings = { calendarEnabled: false };
let schedules = [];
let blockedDays = [];
const sessions = new Map();
createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/reset') { outdated = false; calendarSettings = { calendarEnabled: false }; schedules = []; blockedDays = []; database = Object.fromEntries(resources.map(key => [key, []])); response.end('{}'); return; }
  if (request.url === '/simulate-outdated') { outdated = true; response.end('{}'); return; }
  if (request.url === '/simulate-sessions-unavailable') { sessionsUnavailable = true; response.end('{}'); return; }
  if (request.url === '/health') { response.end('{}'); return; }
  if (request.headers['x-api-key'] !== 'fixture-management-key') { response.writeHead(401); response.end('{"message":"Missing management key"}'); return; }
  if (outdated && request.url.startsWith('/api/management/') && !request.url.startsWith('/api/management/sessions')) { response.writeHead(404, { 'Content-Type': 'text/html' }); response.end('<html>Cannot GET administrative list</html>'); return; }
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname.startsWith('/api/management/sessions')) {
    if (sessionsUnavailable) { response.writeHead(503); response.end('{}'); return; }
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw || '{}');
    const action = url.pathname.split('/')[4];
    response.setHeader('Cache-Control', 'no-store');
    if (!action) { const session = { username: body.username, expiresAt: Date.now() + 8 * 60 * 60 * 1000 }; sessions.set(body.tokenHash, session); response.writeHead(201); response.end(JSON.stringify(session)); return; }
    if (action === 'revoke') { sessions.delete(body.tokenHash); response.writeHead(204); response.end(); return; }
    const session = sessions.get(body.tokenHash);
    if (!session || session.expiresAt <= Date.now()) { response.writeHead(404); response.end('{}'); return; }
    response.end(JSON.stringify(session)); return;
  }
  if (url.pathname.startsWith('/api/scheduling/')) {
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const kind = url.pathname.split('/')[3];
    if (kind === 'settings') { if (request.method === 'PATCH') calendarSettings = body; response.end(JSON.stringify(calendarSettings)); return; }
    if (kind === 'schedules') { if (request.method === 'POST') { const previous = schedules.find(row => row.venueId === body.venueId && row.sportId === body.sportId); schedules = schedules.filter(row => row.id !== previous?.id); const row = { ...body, id: previous?.id ?? randomUUID() }; schedules.push(row); response.writeHead(201); response.end(JSON.stringify(row)); return; } response.end(JSON.stringify(schedules)); return; }
    if (kind === 'blocked-days') {
      if (request.method === 'DELETE') { blockedDays = blockedDays.filter(row => row.id !== url.pathname.split('/')[4]); response.writeHead(204); response.end(); return; }
      if (request.method === 'POST') { const row = { ...body, id: randomUUID() }; blockedDays.push(row); response.writeHead(201); response.end(JSON.stringify(row)); return; }
      response.end(JSON.stringify(blockedDays)); return;
    }
    if (kind === 'day') { response.end(JSON.stringify(database.slots.filter(row => row.venueId === url.searchParams.get('venueId') && row.sportId === url.searchParams.get('sportId') && row.startsAt.startsWith(url.searchParams.get('date'))))); return; }
    if (kind === 'month') { const month = url.searchParams.get('month'); response.end(JSON.stringify(Array.from({ length: 28 }, (_, i) => { const date = month + '-' + String(i + 1).padStart(2, '0'); const blocked = blockedDays.some(row => row.date === date && row.venueId === url.searchParams.get('venueId')); return { date, availableCount: blocked ? 0 : 2, blocked }; }))); return; }
  }
  if (url.pathname === '/api/slots' && request.method === 'GET' && url.search) { response.end(JSON.stringify(database.slots.filter(row => row.venueId === url.searchParams.get('venueId') && row.sportId === url.searchParams.get('sportId') && row.startsAt.startsWith(url.searchParams.get('date'))))); return; }
  const [, , resource, id] = request.url.replace('/management', '').split('/');
  if (!resources.includes(resource)) { response.writeHead(404); response.end('{}'); return; }
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  if (request.method === 'GET') { response.end(JSON.stringify(database[resource])); return; }
  if (request.method === 'POST' && resource === 'booking-drafts' && url.pathname.endsWith('/confirm')) {
    const row = database[resource].find(row => row.id === id);
    if (!row) { response.writeHead(404); response.end('{}'); return; }
    row.status = 'CONFIRMED'; row.confirmedAt = new Date().toISOString();
    const slot = database.slots.find(slot => slot.id === row.slotId); if (slot) slot.status = 'RESERVED';
    response.end(JSON.stringify(row)); return;
  }
  if (request.method === 'POST') {
    if (body.name === 'Error de prueba') { response.writeHead(409); response.end('{"message":"El registro ya existe"}'); return; }
    const row = { ...body, id: randomUUID() };
    database[resource].push(row);
    response.writeHead(201); response.end(JSON.stringify(row)); return;
  }
  const index = database[resource].findIndex(row => row.id === id);
  if (index < 0) { response.writeHead(404); response.end('{"message":"Registro no encontrado"}'); return; }
  if (request.method === 'PATCH') { database[resource][index] = { ...database[resource][index], ...body }; response.end(JSON.stringify(database[resource][index])); return; }
  if (request.method === 'DELETE') { database[resource].splice(index, 1); response.writeHead(204); response.end(); return; }
  response.writeHead(405); response.end('{}');
}).listen(4401, '127.0.0.1');
