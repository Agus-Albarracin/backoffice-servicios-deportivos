// Explicit fixture API, isolated from MySQL. Backend rules are tested in server/test.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
const resources = ['sports', 'zones', 'venues', 'venue-sports', 'slots', 'booking-drafts'];
let database = Object.fromEntries(resources.map(key => [key, []]));
let outdated = false;
createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/reset') { outdated = false; database = Object.fromEntries(resources.map(key => [key, []])); response.end('{}'); return; }
  if (request.url === '/simulate-outdated') { outdated = true; response.end('{}'); return; }
  if (request.url === '/health') { response.end('{}'); return; }
  if (request.headers['x-api-key'] !== 'fixture-management-key') { response.writeHead(401); response.end('{"message":"Missing management key"}'); return; }
  if (outdated && request.url.startsWith('/api/management/')) { response.writeHead(404, { 'Content-Type': 'text/html' }); response.end('<html>Cannot GET administrative list</html>'); return; }
  const [, , resource, id] = request.url.replace('/management', '').split('/');
  if (!resources.includes(resource)) { response.writeHead(404); response.end('{}'); return; }
  let raw = '';
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  if (request.method === 'GET') { response.end(JSON.stringify(database[resource])); return; }
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
