import { expect, test, type Page } from '@playwright/test';
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Usuario', { exact: true }).fill('admin-test');
  await page.getByLabel('Contraseña', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByRole('heading', { name: 'Resumen general' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tu primera sede empieza acá' })).toBeVisible({ timeout: 15000 });
}
test.beforeEach(async ({ request }) => { await request.post('http://127.0.0.1:4401/reset'); });

test('enables creation after recovering from missing administrative endpoints', async ({ page, request }) => {
  await login(page);
  await request.post('http://127.0.0.1:4401/simulate-outdated');
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: /Zonas/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Reiniciá server' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear zona' })).toBeDisabled();
  await request.post('http://127.0.0.1:4401/reset');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crear zona' }).first()).toBeEnabled();
  await page.getByRole('button', { name: 'Crear zona' }).first().click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Crear zona' })).toBeVisible();
});

test('protects pages, management requests and cross-origin login', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get('/api/manage/sports')).status()).toBe(401);
  expect((await request.post('/api/session', { headers: { origin: 'https://other.example' }, data: { username: 'admin-test', password: 'test-password-only' } })).status()).toBe(403);
  await page.getByLabel('Usuario', { exact: true }).fill('admin-test');
  await page.getByLabel('Contraseña', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Ingresar al panel' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'incorrectos' })).toBeVisible();
});

test('creates, edits, filters and deletes a sport, then revokes the session', async ({ page, context }) => {
  await login(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Deportes', exact: false }).first().click();
  await page.getByRole('button', { name: 'Crear deporte' }).first().click();
  await page.getByLabel('Nombre', { exact: true }).fill('Fútbol');
  await page.getByLabel('Ícono o emoji').fill('⚽');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('cell', { name: 'Fútbol', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Fútbol 5');
  await page.getByLabel('Activo', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: 'Deportes', exact: false }).first().click();
  await expect(page.getByRole('cell', { name: /Inactivo/ })).toBeVisible();
  await page.getByLabel('Buscar registros').fill('sin coincidencias');
  await expect(page.getByRole('heading', { name: 'No encontramos resultados' })).toBeVisible();
  await page.getByLabel('Buscar registros').fill('');
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
  await expect(page.getByRole('heading', { name: 'Todavía no hay deportes' })).toBeVisible();
  const cookie = (await context.cookies()).find(item => item.name === 'turnero_admin')!;
  expect(cookie.httpOnly).toBe(true); expect(cookie.sameSite).toBe('Strict');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await context.addCookies([cookie]);
  expect((await context.request.get('/api/manage/sports')).status()).toBe(401);
});

test('preserves form data on API error and works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Deportes', exact: false }).first().click();
  await page.getByRole('button', { name: 'Crear deporte' }).first().click();
  await page.getByLabel('Nombre', { exact: true }).fill('Error de prueba');
  await page.getByLabel('Ícono o emoji').fill('x');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('ya existe');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Error de prueba');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('creates the complete catalog and sends slot times in Buenos Aires', async ({ page }) => {
  await login(page);
  async function create(section: string, singular: string, fill: () => Promise<void>) {
    await page.getByRole('navigation').getByRole('button', { name: new RegExp(section) }).first().click();
    await page.getByRole('button', { name: `Crear ${singular}`, exact: false }).first().click();
    await fill();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  await create('Deportes', 'deporte', async () => { await page.getByLabel('Nombre', { exact: true }).fill('Tenis'); await page.getByLabel('Ícono o emoji').fill('🎾'); });
  await create('Zonas', 'zona', async () => { await page.getByRole('combobox', { name: 'Nombre', exact: true }).selectOption('CABA'); });
  await create('Sedes', 'sede', async () => {
    await page.getByLabel('Nombre', { exact: true }).fill('Club Central');
    await page.getByRole('combobox', { name: 'Zona', exact: true }).selectOption({ label: 'CABA' });
    await page.getByLabel('Dirección', { exact: true }).fill('Calle 123');
    await page.getByLabel('WhatsApp de la sede').fill('+5491100000000');
    await page.getByLabel('Latitud', { exact: true }).fill('-34.6');
    await page.getByLabel('Longitud', { exact: true }).fill('-58.4');
    await page.getByLabel('Descripción', { exact: true }).fill('Cancha de tenis');
  });
  await create('Deportes por sede', 'relación', async () => { await page.getByRole('combobox', { name: 'Sede', exact: true }).selectOption({ label: 'Club Central' }); await page.getByRole('combobox', { name: 'Deporte', exact: true }).selectOption({ label: 'Tenis' }); });
  await create('Turnos', 'turno', async () => {
    await page.getByRole('combobox', { name: 'Sede', exact: true }).selectOption({ label: 'Club Central' });
    await page.getByRole('combobox', { name: 'Deporte', exact: true }).selectOption({ label: 'Tenis' });
    await page.getByLabel('Inicio · Buenos Aires').fill('2099-01-01T18:00');
    await page.getByLabel('Fin · Buenos Aires').fill('2099-01-01T19:00');
  });
  const slots = await (await page.request.get('/api/manage/slots')).json();
  expect(slots[0].startsAt).toBe('2099-01-01T18:00:00-03:00');
  await page.getByText('Horario habitual · configurar disponibilidad automática').click();
  await page.getByLabel('Apertura', { exact: true }).fill('09:00');
  await page.getByLabel('Cierre', { exact: true }).fill('18:00');
  await page.getByLabel('Duración del turno (minutos)').fill('60');
  await page.getByLabel('Cantidad de días a cubrir', { exact: true }).fill('45');
  await page.getByRole('button', { name: 'Guardar horario habitual' }).click();
  await expect(page.getByText('Horario habitual · automático activo')).toBeVisible();
  expect((await (await page.request.get('/api/scheduling/schedules')).json())[0].horizonDays).toBe(45);
  const switchControl = page.getByRole('switch', { name: 'Calendario visible por defecto' });
  await switchControl.check();
  await expect(page.getByLabel('Mes del calendario')).toBeVisible();
  expect((await (await page.request.get('/api/scheduling/settings')).json()).calendarEnabled).toBe(true);
  await page.getByLabel('Fecha a bloquear').fill('2099-01-01');
  await page.getByLabel('Motivo del cierre').fill('Mantenimiento');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Bloquear día completo' }).click();
  await expect(page.getByRole('button', { name: 'Reabrir este día', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reabrir este día', exact: true }).click();
  await expect(page.getByLabel('Motivo del cierre')).toBeVisible();
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await expect(page.getByLabel('Buscar registros')).toBeVisible();
  await create('Solicitudes', 'solicitud', async () => { await page.getByRole('combobox', { name: 'Deporte', exact: true }).selectOption({ label: 'Tenis' }); await page.getByLabel('Nombre · opcional', { exact: true }).fill('Ana'); });
  await expect(page.getByRole('cell', { name: 'Ana', exact: true })).toBeVisible();
  expect((await page.request.post('/api/manage/sports', { headers: { origin: 'https://other.example' }, data: {} })).status()).toBe(403);
  expect((await page.request.get('/api/manage/not-allowed')).status()).toBe(404);
});

test('shows request date and hours, confirms through the protected proxy and refreshes the reserved slot', async ({ page }) => {
  await login(page);
  const origin = 'http://localhost:3101';
  const create = async (resource: string, data: object) => (await page.request.post('/api/manage/' + resource, { headers: { origin }, data })).json();
  const slot = await create('slots', { startsAt: '2099-01-01T21:00:00.000Z', endsAt: '2099-01-01T22:00:00.000Z', status: 'AVAILABLE' });
  const draft = await create('booking-drafts', { renterFirstName: 'Ana', renterLastName: 'Pérez', renterPhone: '+5491100000001', date: '2099-01-01', slotId: slot.id });
  expect((await page.request.post('/api/manage/booking-drafts/' + draft.id + '/confirm', { headers: { origin: 'https://other.example' }, data: {} })).status()).toBe(403);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: /Solicitudes/ }).click();
  await expect(page.getByRole('cell', { name: '01/01/2099', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '18:00 – 19:00', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Registrar pago de reserva', exact: true }).click();
  await expect(page.getByRole('cell', { name: /Pagó reserva/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toBeDisabled();
  expect((await (await page.request.get('/api/manage/slots')).json())[0].status).toBe('RESERVED');
  const paymentPath = '/api/manage/booking-drafts/' + draft.id + '/total-payment';
  expect((await page.request.post(paymentPath, { headers: { origin: 'https://other.example' } })).status()).toBe(403);
  expect((await page.request.get(paymentPath)).status()).toBe(405);
  await page.route('**' + paymentPath, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Pago no registrado. Reintentá.' }) }));
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Registrar pago total', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Pago no registrado' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Pagó reserva/ })).toBeVisible();
  await page.unroute('**' + paymentPath);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Registrar pago total', exact: true }).click();
  await expect(page.getByRole('cell', { name: /Pagó reserva/ })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Registrar pago total', exact: true }).click();
  await expect(page.getByRole('cell', { name: /Pagó total/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar pago total', exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('navigation').getByRole('button', { name: /Solicitudes/ }).click();
  await expect(page.getByRole('cell', { name: /Pagó total/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).toBeDisabled();
  expect((await (await page.request.get('/api/manage/slots')).json())[0].status).toBe('RESERVED');
});
