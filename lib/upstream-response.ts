/** Interpret upstream failures without forwarding HTML or internal response bodies. */
export async function managementResponse(response: Response, collection: boolean): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' };
  const failure = (message: string, status = 502) => Response.json({ message }, { status, headers });
  if (response.status === 401) return failure('La API rechazó la clave de gestión. Revisá la configuración del servidor.');
  if (response.status === 404 && collection) return failure('La API no tiene disponibles los listados administrativos. Reiniciá server con npm run start:dev y verificá que API_BASE_URL apunte a esa API.');
  if (response.status === 204) return new Response(null, { status: 204, headers });
  const raw = await response.text();
  let data: unknown;
  try { data = JSON.parse(raw); }
  catch {
    if (response.status === 429) return failure('La API recibió demasiadas solicitudes. Esperá un minuto y reintentá.', 429);
    if (response.status >= 500) return failure('La API no pudo completar la solicitud. Revisá el servidor y reintentá.', 503);
    return failure(`La API respondió con un formato distinto de JSON (HTTP ${response.status}). Verificá API_BASE_URL y que el servidor NestJS esté actualizado.`);
  }
  if (response.ok && collection && !Array.isArray(data)) return failure('La API no devolvió el listado esperado. Verificá que API_BASE_URL apunte al servidor NestJS del proyecto.');
  return Response.json(data, { status: response.status, headers });
}
