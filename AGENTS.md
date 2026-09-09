<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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

## CRÍTICO: una tarea específica por rama

Preferencia permanente y explícita del usuario para este flujo de trabajo:

- Antes de editar, proponer o reutilizar el ítem de GitHub Projects y declarar
  repositorio, objetivo verificable, rama, base exacta y motivo de esa base.
- Cada rama resuelve una sola tarea específica. Puede contener varios commits,
  pero todos deben contribuir a sus criterios de aceptación. La rama no es un
  contenedor para todo lo realizado durante una sesión.
- Usar `feat|fix|refactor|docs|chore/<resultado-concreto>`, por ejemplo
  `feat/filtros-solicitudes` o `fix/confirmacion-duplicada`. No usar nombres
  genéricos como `pendientes`, `mejoras`, `cierre-documentacion` o `backend`.
- Tarea independiente: partir de `main` actualizada, comprobando la referencia
  remota cuando haya acceso autorizado. Si no se pudo comprobar, informar la
  referencia y el hash local utilizados; no afirmar que están actualizados.
- Partir de otra rama únicamente cuando sus cambios aún no integrados sean
  necesarios para esta tarea. Explicar la dependencia concreta y registrar el
  hash de base. Estar trabajando en esa rama no justifica heredarla.
- Si aparece una nueva funcionalidad o arreglo independiente, proponer otro
  ítem y preparar otra rama antes de implementarlo. Preservar el trabajo actual;
  usar un worktree cuando cambiar de rama pueda mezclar cambios.
- Repetir un nombre entre repositorios solo si todos contribuyen a la misma
  tarea concreta. Compartir sesión, tipo de archivo o etapa de cierre no basta.
- Antes de cada commit, revisar tanto el diff preparado como los commits propios
  de la rama respecto de su base. Separar tareas ajenas; no confundir commits
  heredados de una dependencia con commits propios. No crear una rama por archivo
  o por commit cuando forman parte de un mismo resultado.
- Preparar las ramas y los commits locales autorizados y entregar un resumen
  con ítem, repositorio, rama, base, hashes, títulos exactos y validaciones.
  El push queda pendiente de confirmación explícita del usuario; reutilizarla
  si ya fue otorgada para esas ramas y ese alcance. No hacer push automático.
- Para GitHub, vincular el ítem con el PR de esa tarea cuando su publicación esté
  autorizada. En ramas dependientes, declarar la dependencia y dirigir el PR a
  la base correspondiente; una vez integrada, revisar el diff contra `main`
  antes de cambiar el destino. No marcar Done solo por crear commits locales:
  distinguir preparado, publicado, en revisión e integrado.
- Al separar trabajo anterior, conservar los originales y verificar que todos
  los cambios quedan representados. No reescribir ni eliminar ramas publicadas
  como consecuencia automática de esta regla.

## Push manual

El usuario ejecuta los pushes. Después de preparar commits, entregar siempre
los comandos PowerShell exactos en orden de dependencias, con repositorio,
rama, base, hashes, títulos y destino de PR. Distinguir ramas pendientes de
las sincronizadas y explicar si el remoto solo se comparó con referencias
locales. No ejecutar push ni pedir permiso para hacerlo mientras siga vigente
este modo manual. Ver `references/project-items.md` de las skills de Git.
