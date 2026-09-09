# Contexto compartido del workspace

Copia versionada del contexto de la raíz, que no es un repositorio Git. Las rutas del texto se interpretan desde `erp-futbol1/`.

# Turnero de polideportivos: contexto compartido

## Leer antes de implementar

Este archivo rige `client/` y `server/`. Antes de crear una interfaz o conectar una pantalla:

1. Leer este documento y el `AGENTS.md` de la aplicación afectada.
2. Leer [el contrato de integración](docs/integracion.md) y [la documentación del backend](server/README.md).
3. Revisar los controllers, DTOs y servicios del recurso involucrado. El código define el contrato implementado; si difiere del producto esperado, documentar la diferencia y resolverla antes de conectar.
4. Identificar entradas, respuesta, validaciones, estados de interfaz y efecto sobre el borrador.

## Estado actual y responsabilidades

| Ubicación | Estado / responsabilidad |
| --- | --- |
| `client/` | Next.js 16.3.4, React 19, TypeScript y Tailwind CSS 4. App Router en `app/`; flujo de seis pasos implementado, lista/calendario y reservas visibles. |
| `backoffice/` | Next.js, administración autenticada, disponibilidad recurrente, filtros y confirmación de solicitudes. |
| `server/` | NestJS 12 con API REST, validaciones, catálogos, disponibilidad y borradores implementados. |
| `server/src/storage/` | Persistencia MySQL/MariaDB mediante mysql2. Modelos públicos en `models.ts`. |
| `server/migrations/` | Esquema SQL versionado. |
| `docs/integracion.md` | Correspondencia entre pantallas, endpoints y estado compartido. |

Son tres aplicaciones con sus propios `package.json`; ejecutar los comandos desde cada carpeta. La raíz no tiene un paquete npm. La existencia del backend no demuestra que la base esté configurada o tenga catálogos cargados.

El frontend controla navegación, presentación, validación inmediata y estado de formularios. El backend controla persistencia, compatibilidad, disponibilidad y generación del mensaje de WhatsApp. El cliente no accede a MySQL ni importa repositorios o servicios NestJS.

## Objetivo y alcance

MVP web simple y guiado para elegir deporte, completar datos, seleccionar zona, sede y turno, y abrir WhatsApp con una solicitud precompletada. La sede coordina por WhatsApp y el administrador confirma la reserva desde el backoffice.

Incluye ficha de sede, dirección, mapa o enlace de ubicación, disponibilidad y resumen. Quedan fuera cobros, señas, cuentas, perfiles, cancelaciones y reprogramaciones automáticas, geolocalización y confirmación automática. El panel administrativo y la confirmación manual sí están implementados.

## Flujo obligatorio

| Paso | Pantalla | Resultado |
| --- | --- | --- |
| 1 | Deportes | Elegir deporte activo; crear borrador con `sportId`. |
| 2 | Datos de alquiler | Guardar nombre, apellido y teléfono validados. |
| 3 | Zona y sede | Elegir zona y sede habilitada compatible con el deporte. |
| 4 | Detalle de sede | Mostrar nombre, descripción, dirección y ubicación antes del calendario. |
| 5 | Disponibilidad | Elegir fecha y turno disponible de la sede y deporte. |
| 6 | Resumen y WhatsApp | Revisar datos y abrir la URL generada por el backend. |

Se puede volver sin perder datos válidos. Tras un cambio, usar el borrador devuelto por el backend para reflejar las selecciones invalidadas.

## Reglas compartidas

- Zonas: `CABA`, `SUR`, `NORTE`, `NOROESTE`, `OESTE`; las relaciones usan UUID, no estos nombres.
- Elegir zona antes de sede; sede y fecha antes de turno.
- Ofrecer únicamente sedes habilitadas compatibles con el deporte y la zona.
- Un turno debe corresponder a sede, deporte y fecha, estar disponible y ser futuro.
- El contacto requiere nombre y apellido de 1–80 caracteres de texto plano, sin espacios extremos, y teléfono internacional con `+` y 8–15 dígitos. Sugerir `+54` para Argentina.
- Usar `America/Argentina/Buenos_Aires` para fechas y horarios del negocio; no depender de la zona del dispositivo.
- Habilitar WhatsApp solo con todos los datos válidos y revalidar con el backend.
- Generar o abrir un enlace no acredita envío del mensaje. Mostrar “Gestionar por WhatsApp” y “Pendiente de confirmación”; no afirmar “Solicitud enviada” ni “Reserva confirmada” sin evidencia real.
- La generación del enlace no bloquea ni consume disponibilidad.
- El destino es el WhatsApp de la sede. El backend construye el mensaje codificado con deporte, sede, dirección, fecha, horario y contacto, sin IDs internos.
- Si falla el mapa, mantener dirección y enlace visibles y permitir continuar.
- No exponer `MANAGEMENT_API_KEY`, credenciales DB ni identificadores de borrador en logs o analítica. Renderizar texto sin HTML inyectado.

## Estados de interfaz y aceptación

Implementar carga, catálogo vacío, sin sedes compatibles, sin turnos por fecha, error con reintento, validación del contacto, guardado en curso y resumen listo. Evitar envíos duplicados y respuestas atrasadas al cambiar filtros.

La integración se considera lista cuando permite completar los seis pasos, conserva contacto al retroceder, refleja invalidaciones del backend, impide seleccionar turnos inválidos y abre el mensaje correcto con aviso de confirmación pendiente. También debe manejar API caída y disponibilidad que cambió antes de generar WhatsApp.

## Estrategia de implementación

1. Construir interfaces siguiendo el flujo y los contratos existentes.
2. Centralizar acceso a datos en una capa del frontend; no dispersar URLs y conversiones por las pantallas.
3. Si se necesitan mocks para diseño, hacerlos explícitos y compatibles con el contrato; nunca sustituir silenciosamente errores reales por datos ficticios.
4. Conectar por pasos y comprobar el recorrido completo con datos controlados.
5. Actualizar esta documentación si cambia un contrato o regla de negocio.

## Decisiones resueltas y pendientes

Ya están definidos el stack, backend, persistencia MySQL/MariaDB, destino por sede y enlace a Google Maps en el detalle. No volver a tratarlos como decisiones iniciales pendientes.

Falta definir el catálogo real de deportes y sedes, imágenes, precios, duraciones, horarios, políticas de disponibilidad y responsables de mantener los catálogos. No inventar esas reglas. Se puede avanzar en interfaces y contratos sin esos datos; pedir definición cuando una implementación dependa de ellos.

## CRÍTICO: proponer ítems antes de implementar

Preferencia explícita del usuario: antes de modificar código o documentación de
una tarea, presentar ítems listos para GitHub Projects con objetivo, repositorios,
criterios de aceptación, dependencias, rama y avances previstos. Una funcionalidad
puede tener varios commits. Reutilizar ítems existentes; si el trabajo ya se hizo,
identificar la propuesta como retrospectiva.

Aplicar `atomic-commits` y `git-workflow-and-versioning`, especialmente su referencia
`references/project-items.md`. Las skills están instaladas en
`C:/Users/Agust/.codex/skills/`; server y client también tienen una copia local de
`atomic-commits` en `.agents/skills/`. La propuesta no requiere una confirmación
adicional para continuar con trabajo autorizado. Publicar o modificar ítems en
GitHub requiere autorización vigente y un destino identificado.

Crear cada rama independiente desde `main` actualizada antes de editar; usar el mismo nombre en
los repositorios afectados y declarar la base real. Al terminar, relacionar los
ítems con los commits, las validaciones y los pendientes.
