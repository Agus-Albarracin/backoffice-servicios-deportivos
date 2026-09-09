# Organización por tareas

Propuestas locales para GitHub Projects; no son issues publicados.

| Ítem | Repositorio | Resultado verificable | Rama | Base |
| --- | --- | --- | --- | --- |
| RAMAS-01 | backoffice | Exigir ítem, rama específica, base justificada y revisión previa al push | `chore/ramas-por-tarea` | `main` (`bdf4a85`) |
| RAMAS-01 | client | Aplicar la misma política a la skill local y al contexto | `chore/ramas-por-tarea` | `chore/skills-frontend` |
| RAMAS-01 | server | Aplicar la misma política a la skill local y al contexto | `chore/ramas-por-tarea` | `chore/skills-backend` |
| DOC-01 | backoffice | Versionar el contrato y contexto de reservas y corregir su descripción | `docs/contrato-reservas` | `main` (`bdf4a85`) |
| SKILL-01 | client | Versionar las guías de desarrollo frontend | `chore/skills-frontend` | `main` (`0686345`) |
| DOC-02 | client | Documentar calendario, confirmación administrativa y reservas visibles | `docs/calendario-reservas` | `main` (`0686345`) |
| SKILL-02 | server | Versionar las guías de desarrollo backend | `chore/skills-backend` | `main` (`63d9f9a`) |
| MYSQL-01 | server | Conservar el auxiliar de inicio local y excluir los datos de Git | `chore/mysql-local` | `main` (`63d9f9a`) |
| DOC-03 | server | Documentar confirmación y cobertura real de la API | `docs/confirmacion-reservas` | `main` (`63d9f9a`) |

RAMAS-01 tiene prioridad crítica por indicación del usuario. Los otros ítems son
retrospectivos: separan cambios preparados previamente, sin presentar el trabajo
existente como una implementación nueva.

Las ramas RAMAS-01 de client y server dependen de sus ramas de skills porque
modifican archivos que esas ramas incorporan. Las ramas de documentación y MySQL
son independientes. Las bases corresponden a las referencias locales verificadas;
no se realizó una nueva consulta al remoto durante esta reorganización.

## Criterios de aceptación de RAMAS-01

- [x] Las dos skills globales y las dos copias locales de atomic-commits contienen la regla.
- [x] El contexto compartido y las instrucciones de cada repositorio contienen la regla.
- [x] Cada rama tiene un resultado y una base identificables.
- [x] Las ramas anteriores se conservan; el historial publicado no se reescribe.
- [x] La publicación queda separada de la preparación local y requiere confirmación.

## Publicación e integración

El resumen de entrega debe incluir los hashes y títulos exactos. Publicar primero
las ramas de skills cuando se autorice el push de sus dependientes. Los PR de
RAMAS-01 en client y server deben declarar esa dependencia y comparar contra la
rama de skills mientras no esté integrada. Revisar nuevamente el diff al pasar
la base a main.

Las ramas originales `chore/cierre-documentacion` conservan los commits anteriores
como referencia. La de server ya tenía una referencia remota al inspeccionarla.
No publicar simultáneamente el conjunto antiguo y las ramas que lo reemplazan:
antes de abrir PR, revisar cuáles de estos cambios ya se integraron en GitHub.

Crear commits locales no completa por sí solo la revisión ni la integración de
un ítem. Registrar ese estado explícitamente en lugar de marcarlo Done por el push.
