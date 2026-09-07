import { expect, test } from '@playwright/test';
import { managementResponse } from '../lib/upstream-response';

test('explains missing administrative endpoints instead of a JSON parsing error', async () => {
  for (const body of ['<!DOCTYPE html><html>Not found</html>', '{"message":"Cannot GET /api/management/sports"}']) {
    const response = await managementResponse(new Response(body, { status: 404 }), true);
    expect(response.status).toBe(502);
    expect((await response.json()).message).toContain('Reiniciá server');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  }
});

test('accepts empty catalogs and preserves backend validation errors', async () => {
  const empty = await managementResponse(Response.json([]), true);
  expect(empty.status).toBe(200);
  expect(await empty.json()).toEqual([]);
  const validation = await managementResponse(Response.json({ message: ['Dato inválido'] }, { status: 400 }), false);
  expect(validation.status).toBe(400);
  expect(await validation.json()).toEqual({ message: ['Dato inválido'] });
  const missing = await managementResponse(Response.json({ message: 'Registro no encontrado' }, { status: 404 }), false);
  expect(missing.status).toBe(404);
});

test('rejects wrong catalog shapes and masks non-JSON infrastructure responses', async () => {
  expect((await managementResponse(Response.json({ unrelated: true }), true)).status).toBe(502);
  const unavailable = await managementResponse(new Response('<html>proxy internals</html>', { status: 503 }), true);
  expect(unavailable.status).toBe(503);
  expect(JSON.stringify(await unavailable.json())).not.toContain('proxy internals');
});
