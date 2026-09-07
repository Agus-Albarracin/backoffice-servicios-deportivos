# Backoffice del turnero

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
- Los borradores no son reservas confirmadas; este panel no confirma ni envía mensajes.

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
`APP_ORIGIN` con el origen HTTPS real y `API_BASE_URL` con la API. Usar un único
proceso Node.js: sesiones y límite de login están en memoria y se pierden al
reiniciar. Para múltiples réplicas/serverless, migrar ambos a almacenamiento
compartido antes de desplegar. HTTPS es necesario para las cookies de producción.
No hace falta ampliar CORS en NestJS porque la conexión es servidor a servidor.

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
