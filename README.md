# Backoffice del turnero

## Calendario y horarios automáticos

En **Turnos**, el switch **Calendario visible por defecto** guarda en la API la
vista inicial de client y backoffice. Los botones Lista/Calendario permiten
alternar sin cambiar la preferencia compartida. El client consulta esa preferencia
al entrar a disponibilidad; no requiere editar código ni desplegar otra vez.

Elegir sede y deporte, abrir **Horario habitual**, completar días, apertura,
cierre, duración y anticipación máxima, y guardar. La API calcula los turnos
automáticamente dentro de una ventana móvil, sin cargarlos uno por uno. La
anticipación admite 1–365 días. Los horarios/duración reales los define el
administrador; no se activan reglas de ejemplo sobre los datos existentes.

En **Días no disponibles**, bloquear una fecha cierra todos los deportes de esa
sede. Puede reabrirse desde el mismo panel. Se conservan las solicitudes y los
bloqueos individuales de turnos; bloquear no envía mensajes de cancelación.
El backend revalida también los borradores y el enlace de WhatsApp.

Se utiliza **@daypicker/react 10.0.1 (MIT)** en ambos frontends. Investigación:
[informe de calendarios](docs/informe-calendarios.pdf). Una franja habitual por
sede/deporte, dentro del mismo día; no incluye una agenda semanal por horas,
capacidad por cancha ni cambios masivos de reservas confirmadas.

Requiere la nueva migración `server/migrations/002_scheduling.sql`. En otro entorno,
hacer backup, ejecutar `npm run db:migrate` desde `server/` y reiniciar la API.
No modificar la migración inicial. La vista inicial sigue en lista hasta activar
el switch. Los turnos manuales existentes siguen funcionando.

Los GET `/scheduling/month` son de solo lectura. `/slots` materializa únicamente
los turnos del día consultado dentro de una transacción, con UUID estables e
idempotencia. No crea reservas ni consume disponibilidad. La tabla clásica y los
contadores muestran registros materializados; el calendario también anticipa
horarios futuros aún no materializados. Para grandes volúmenes, implementar
paginación y optimizar consultas antes de escalar.

Panel Next.js independiente del frontend público en `client/`. Permite ingresar
como administrador y crear, editar, buscar, filtrar y eliminar deportes, zonas,
sedes, relaciones sede/deporte, turnos y borradores de solicitudes mediante NestJS.
Incluye resumen, formularios con relaciones, horarios de Buenos Aires, confirmación
de borrado, paginación local y estados de carga, vacío, error y guardado.

## Iniciar localmente

Con la API y MySQL del proyecto en funcionamiento:

```powershell
npm install
npm run setup
npm run dev
```

Abrir http://localhost:3001. `setup` pide el nombre de usuario, genera una contraseña
aleatoria y la muestra **una sola vez en tu terminal** para guardarla. Crea
`.env.local` con su hash scrypt, un secreto aleatorio de sesión y copia la clave de
gestión desde `server/.env` si existe, sin mostrarla. Nunca sobreescribe un archivo
existente. No hay credenciales predeterminadas. Si falta la clave, completarla en
`.env.local` con el mismo valor que usa NestJS. No subir este archivo a Git.

Si `server` estaba ejecutándose sin modo watch, reiniciarlo para incorporar las
rutas `/api/management/*`. Los cambios están en `server/src/management`,
`server/src/app.module.ts` y `server/test/management.e2e-spec.ts`.
El código NestJS se mantiene únicamente en `server/`, con su propio tsconfig y
dependencias; no copiar los controllers dentro de la aplicación Next.js.

## Arquitectura y contrato

- Navegador → `/api/manage/*` de Next.js → API NestJS → MySQL. Sin acceso directo a DB.
- Next.js autentica cada lectura/escritura y solo admite seis recursos y UUID v4.
- Los GET de colecciones usan `/api/management/{recurso}`, protegidos por `X-API-Key`,
  con arrays completos y `no-store`. Incluyen inactivos, bloqueados y pasados.
- POST, PATCH y DELETE reutilizan las rutas originales y las validaciones de NestJS.
- No se envían campos `id`, `null` ni campos sin cambios en PATCH. Se conserva la
  respuesta completa del servidor. La API no permite vaciar campos opcionales ya
  guardados; el formulario informa esa restricción. Cambios de selección pueden
  invalidar sede/turno conforme a la API.
- El servidor rechaza eliminaciones con dependencias. No hay borrado en cascada.
- Los borradores quedan pendientes hasta usar Registrar pago de reserva en el panel. La API reserva el horario; el panel no envía mensajes automáticamente.

## Acceso y despliegue

Primera versión con **un usuario administrador configurable** y permisos sobre
todos los recursos del negocio. No incluye gestión de cuentas, roles, auditoría ni
editor SQL/tablas internas. Se administra el dominio mediante API.

Sesiones opacas firmadas, HttpOnly, SameSite=Strict, ocho horas, revocación al cerrar
sesión y Secure en producción. Contraseña guardada solo como hash scrypt. Diez
intentos de login por minuto en total por proceso; no se confía en cabeceras IP.
Escrituras y login verifican Origin contra `APP_ORIGIN`. No hay secretos en
NEXT_PUBLIC, bundle ni almacenamiento del navegador. Sin caché de datos de gestión.

`npm run build` y `npm start` ejecutan producción en el puerto 3001. Configurar
`APP_ORIGIN` con el origen HTTPS real y `API_BASE_URL` con la API. Las sesiones
se guardan en MySQL a través de los endpoints privados de server y se conservan
entre instancias o reinicios del backoffice. El límite de intentos de login sigue
siendo por proceso, no un límite global entre réplicas. HTTPS es necesario para
las cookies de producción.
No hace falta ampliar CORS en NestJS porque la conexión es servidor a servidor.

Antes de publicar este backoffice, desplegar server con los endpoints
`POST /api/management/sessions`, `/lookup` y `/revoke`, y aplicar su migración
`004_admin_sessions.sql` mediante el migrador. Si Render usa
`node scripts/migrate.mjs && npm run start:prod`, la aplica al arrancar.
Ambas aplicaciones deben compartir MANAGEMENT_API_KEY. La cookie mantiene
firma HMAC, HttpOnly, SameSite y expiración absoluta de ocho horas; solo se envía
a server el hash SHA-256 del identificador. Cerrar sesión revoca ese hash en
la base antes de borrar la cookie. Las cookies del almacenamiento anterior
requieren volver a iniciar sesión una vez. Si la API de sesiones falla, el
backoffice no crea una cookie ni concede acceso.

`npm run test:sessions` construye producción y levanta dos procesos Next locales
con credenciales ficticias y una API de prueba compartida. Comprueba login en
una instancia, acceso en otra, rechazo de cookies alteradas, revocación cruzada
y fallo seguro si no se puede guardar la sesión. Usa los puertos 3301, 3302 y
4401; no conecta a Aiven. Complementa las pruebas de los endpoints de server.

La paginación y búsqueda son en memoria. Para grandes volúmenes, agregar paginación
y filtros administrativos en API antes de cargar todo el catálogo. Los turnos de
sedes/deportes desactivados siguen sujetos a las reglas de compatibilidad existentes
del backend al editarlos. No se inventan precios, canchas, duración ni solapamientos.

## Verificación

```powershell
npm run build
npm run lint
npm run typecheck
npm test
```

Playwright inicia un Next.js aislado en 3101 y una API fixture explícita en 4401,
con credenciales ficticias. Cubre acceso, CSRF, revocación, CRUD, errores, móvil,
relaciones y horarios. No toca MySQL. Requiere Chromium de Playwright instalado
(`npx playwright install chromium` si falta).

En `server/`, `npm run test:e2e` verifica el contrato HTTP real con repositorio en
memoria, incluidos guard, registros inactivos, turnos bloqueados y Swagger de los
seis nuevos endpoints. `npm test` y `npm run lint` completan los controles del backend.
## Pago de reserva y pago total

En **Solicitudes** se muestran fecha, horario de inicio y fin en Buenos Aires y estado. **Registrar pago de reserva** requiere contacto y horario elegidos; la API vuelve a validar disponibilidad y reserva el turno. La solicitud pasa a «Pagó reserva». **Registrar pago total** permite pasarla a «Pagó total» después de recibir el pago externo, incluso si el turno ya pasó. Los datos de la solicitud confirmada no se pueden editar ni eliminar. Generar WhatsApp conserva el estado pendiente.

La API requiere las migraciones `003_reservations.sql` y `005_reservation_payments.sql`. Aplicar la nueva migración y desplegar server antes que backoffice. El estado técnico CONFIRMED se conserva; `paymentStatus` distingue PENDING, RESERVATION_PAID y TOTAL_PAID. `totalPaidAt` registra cuándo el administrador marcó el total. Los reintentos no duplican el pago y ambos estados mantienen el turno ocupado. La plataforma registra pagos externos; no procesa cobros. Los filtros de Solicitudes incluyen Pendientes, Pagó reserva y Pagó total. El client muestra los horarios reservados en ámbar, sin permitir seleccionarlos. Los cierres de días no cancelan reservas confirmadas.
