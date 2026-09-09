# Registro histórico de pendientes locales

Este registro describe la preparación anterior. La agrupación en
`chore/cierre-documentacion` fue reemplazada por ramas específicas por tarea.
La política vigente está en [project-items.md](project-items.md).

Ítems propuestos en la conversación antes de comenzar. Estas referencias PLAN
son locales: no son issues publicados ni IDs de GitHub Projects.

## PLAN-01 · Completar planificación y skills

- Prioridad: crítica.
- Repositorios: backoffice, client y server.
- Objetivo: versionar las skills y el contexto que exigen proponer ítems antes de implementar.
- [x] Plantilla con alcance, aceptación, dependencias y rama.
- [x] Reutilización de autorización vigente, sin pedir aprobación duplicada.
- [x] Skills revisadas y validadas.
- [x] Preparación local diferenciada de publicación en GitHub.

## PLAN-02 · Alinear documentación

- Prioridad: alta.
- Repositorios: backoffice, client y server; contexto compartido de la raíz.
- Objetivo: describir el comportamiento real de calendario, solicitudes y reservas.
- [x] Eliminar afirmaciones de scaffold y ausencia de administración.
- [x] Documentar confirmación protegida, inmutabilidad y horarios reservados.
- [x] Documentar 48 operaciones y comprobar la suite de Swagger.
- [x] Conservar una copia versionada del contrato y contexto compartidos en backoffice.
- [x] Documentar y validar sintaxis del auxiliar local MySQL, sin iniciarlo.

## PLAN-03 · Ordenar ramas locales

- Prioridad: alta.
- Repositorios: los tres.
- Objetivo: continuar cada tarea independiente desde main actualizada, preservando cambios locales.
- [x] Consultar las referencias remotas.
- [x] Actualizar o crear main local desde origin/main.
- [x] Crear chore/cierre-documentacion desde origin/main en cada repositorio.
- [x] Conservar ramas anteriores y cambios existentes.

Los commits se agrupan por skills, documentación y herramienta MySQL local.
La publicación de estas ramas, su revisión e integración se gestionan por separado.
Este cierre no incluye despliegue, migraciones, cambios de producción ni publicación de ítems.
