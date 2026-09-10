# Integración de client, server y backoffice

## Aplicaciones y transporte

- Client: Next.js en `http://localhost:3000`. El flujo está en `features/booking/` y el transporte en `lib/api/client.ts`, mediante `NEXT_PUBLIC_API_BASE_URL` (por defecto `http://localhost:4000/api`).
- Server: NestJS en `http://localhost:4000/api`. Controla persistencia, compatibilidad, disponibilidad y confirmación.
- Backoffice: Next.js en `http://localhost:3001`. El navegador usa sesión HttpOnly y los proxies `/api/manage/*` y `/api/scheduling/*`; solo el servidor Next.js envía `X-API-Key` a NestJS. Las escrituras comprueban el origen.

Las respuestas son objetos o arrays directos, sin envoltorio `data`. Las fechas del negocio usan `America/Argentina/Buenos_Aires`. Nunca exponer claves de gestión o DB en client. Los catálogos y horarios reales los configura el administrador.

## Flujo público

| Paso | API relativa a `/api` | Resultado |
| --- | --- | --- |
| Deporte | `GET /sports`, `POST /booking-drafts` | Catálogo activo e inicio con `sportId` |
| Contacto | `PATCH /booking-drafts/:id` | Nombre, apellido y teléfono internacional |
| Zona y sede | `GET /zones`, `GET /venues?zoneId=UUID&sportId=UUID`, PATCH del borrador | Selección compatible |
| Detalle | `GET /venues/:id` | Datos de sede y `mapUrl` |
| Vista inicial | `GET /scheduling/settings` | `calendarEnabled`, false por defecto |
| Mes | `GET /scheduling/month?venueId=UUID&sportId=UUID&month=YYYY-MM` | Días con `availableCount`, `reservedCount`, `blocked` |
| Horarios | `GET /scheduling/day?venueId=UUID&sportId=UUID&date=YYYY-MM-DD` | Horarios `AVAILABLE` y `RESERVED`, sin contacto ni ID de solicitud |
| Elegir turno | PATCH del borrador con `date` y `slotId` | Selección revalidada; solo disponible y futura |
| Resumen | `POST /booking-drafts/:id/whatsapp` | `PENDING_CONFIRMATION`, `summary`, mensaje y URL |

`GET /slots` conserva el contrato de horarios disponibles y futuros. Client consulta `/scheduling/day` para mostrar también reservados en ámbar, sin selección. La disponibilidad se refresca periódicamente y al recuperar foco; la API siempre vuelve a validar al guardar.

El UUID del borrador es un secreto de acceso. Las lecturas y escrituras individuales son públicas por ese secreto, salvo la confirmación administrativa. No registrarlo en analítica ni compartirlo públicamente. El borrador permanece en estado React durante el recorrido; recargar la página no recupera automáticamente esa solicitud.

Los PATCH rechazan campos extra y valores null. Cambiar deporte o zona puede invalidar sede; cambiar deporte, zona, sede o fecha invalida el turno anterior salvo que se envíe uno nuevo válido. Reemplazar el borrador local por la respuesta completa, conservar formularios ante errores y descartar lecturas atrasadas.

## Administración y reserva

`GET /management/{sports,zones,venues,venue-sports,slots,booking-drafts}` requiere clave y devuelve listas completas, incluidos registros inactivos. El panel pagina y filtra en memoria: en Solicitudes combina búsqueda, estado, sede, deporte y rango inclusivo de fechas del turno.

`POST /booking-drafts/:id/confirm` requiere `X-API-Key`, solicitud completa y horario futuro disponible. Es atómico e idempotente: una segunda solicitud para el mismo turno recibe 409. La respuesta incluye `CONFIRMED` y `confirmedAt`; las solicitudes con turno incluyen `startsAt` y `endsAt`. Los datos del alquiler confirmado no se editan ni eliminan y su turno no se modifica; el registro posterior de pago total usa la acción administrativa específica descrita al final.

WhatsApp prepara un enlace: no envía mensajes ni ocupa horarios. Mostrar pendiente hasta que exista confirmación real. La respuesta de WhatsApp contiene deporte, sede, turno y contacto; `summary.venue` no incluye necesariamente `mapUrl`.

## Reglas y cierres

React DayPicker 10.0.1 permite alternar lista y calendario. `PATCH /scheduling/settings` protegido persiste la preferencia inicial global; cambiar de vista localmente no cambia esa preferencia.

`GET/POST /scheduling/schedules` protegido lista o guarda una regla por sede/deporte: `isActive`, `weekdays` (máscara 1–127; domingo=1), `opensAt`, `closesAt`, `durationMinutes` (15–720), `horizonDays` (1–365). El panel llama al último campo “Cantidad de días a cubrir”. Solo admite una franja diaria sin cruce de medianoche; no ofrece intervalos incompletos.

`GET/POST /scheduling/blocked-days` y `DELETE /scheduling/blocked-days/:id` son administrativos. El cierre afecta todos los deportes de la sede durante la fecha indicada; reabrir respeta las reglas y bloqueos individuales. Los motivos internos no se publican.

La vista mensual no materializa turnos; consultar disponibilidad diaria materializa candidatos de forma idempotente con UUID deterministas y transacción serializada. Cierres y reglas obsoletas ocultan disponibilidad, pero no cancelan reservas confirmadas. Cambiar la duración no regenera horarios automáticos sobre reservas automáticas existentes. Los turnos manuales representan capacidad independiente; no existe un modelo de canchas.

## Persistencia y errores

Las migraciones son aditivas: `001_initial.sql`, `002_scheduling.sql` y `003_reservations.sql`. Nunca modificar una migración aplicada. La base local ya fue migrada con backup; un entorno distinto requiere comprobar sus propias migraciones.

Calendario, disponibilidad y datos administrativos sensibles usan `Cache-Control: no-store`. Manejar errores de red y respuestas no JSON sin inventar resultados: 400 validación o selección inválida, 401/403 autorización/origen, 404 referencia, 409 conflicto/dependencia, 413 tamaño, 429 límite y 503 persistencia. Reintentar conservando los datos válidos y sin avanzar como si el guardado hubiese funcionado.

## Verificación

- Server: `npm run docs:check`, `npm run lint`, `npm test`, `npm run test:e2e`.
- Client: `npm run lint`, `npm run build`, `npm test`.
- Backoffice: `npm run lint`, `npm run typecheck`, `npm test`.

Las pruebas usan fixtures o memoria; no demuestran despliegue ni conectividad de producción. Swagger tiene 52 operaciones documentadas. Revisar DTOs y servicios al cambiar contratos.

## Sesiones administrativas persistentes

Backoffice valida las credenciales y conserva una cookie opaca firmada. Server
persiste en MySQL el hash SHA-256 del identificador, usuario y vencimiento de
ocho horas mediante `004_admin_sessions.sql`. Los POST privados
`/api/management/sessions`, `/lookup` y `/revoke` requieren X-API-Key y no-store.
Las sesiones se verifican y revocan entre instancias; ningún cliente accede
directamente a MySQL. Publicar y migrar server antes de publicar backoffice.
La indisponibilidad de sesiones no concede acceso. El límite de intentos de
login de backoffice sigue siendo local a cada proceso y no global.


## Registro de pagos externos (PLAN-PAY-01)

Integrado localmente en `server/` y `backoffice/`, pendiente de publicación
y despliegue. En Solicitudes, «Confirmada» se reemplaza por «Pagó reserva». La
acción «Registrar pago de reserva» usa POST /booking-drafts/:id/confirm y conserva
sus validaciones e idempotencia. La equivalencia visual incluye confirmaciones
preexistentes; no se infiere pago total ni evidencia bancaria.

POST /booking-drafts/:id/total-payment requiere X-API-Key y una reserva confirmada
(409 si falta). Devuelve 200, es idempotente y acepta turnos pasados o cerrados.
No modifica disponibilidad, contacto ni horario. El backoffice lo expone por su
proxy autenticado y con validación de origen, tras confirmar recepción externa.

La respuesta de solicitud conserva status CONFIRMED y confirmedAt y agrega
paymentStatus (PENDING, RESERVATION_PAID o TOTAL_PAID); totalPaidAt aparece solo
para el total y representa la fecha del primer registro administrativo, no del
pago bancario. PATCH no permite escribir esos campos. No se habilitan edición
general, eliminación, reversiones, montos ni procesamiento de cobros.

Aplicar 005_reservation_payments.sql antes del backend y luego desplegar
backoffice. La disponibilidad pública mantiene AVAILABLE/RESERVED sin campos de
pago. El cliente público no necesita cambios.
