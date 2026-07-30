# Governance / Gobernanza

## English

### Principles

RescueSketch is governed in public with four priorities:

1. user safety and repository security;
2. fidelity and traceability to the current official English rules;
3. accessibility and reproducible physical measurements;
4. sustainable, welcoming open-source maintenance.

RescueSketch is independent and cannot make official RoboCup rulings.

### Roles

- **Users** use the software and report feedback.
- **Contributors** submit issues, discussions, tracks, documentation, code, or
  translations under the applicable licence.
- **Reviewers** are trusted contributors who provide domain or technical
  review but cannot merge by role alone.
- **Maintainers** triage work, manage releases, protect security, approve
  community tracks, and merge changes.
- **Lead maintainer:** `@eeminionn` has final responsibility for repository
  access, releases, and unresolved project decisions.

Roles are earned through sustained, constructive work. A maintainer nomination
is discussed privately among current maintainers, then announced publicly.
Inactive maintainers may move to emeritus status after a documented attempt
to contact them.

### Decisions

Routine decisions use lazy consensus in the relevant issue or pull request.
Substantial architecture, licensing, data-handling, rules-interpretation, or
governance changes require a public discussion, documented alternatives, and
explicit maintainer approval.

When consensus is not possible, maintainers decide based on the principles
above. The lead maintainer resolves a tie and documents the rationale. Urgent
security action may be private until coordinated disclosure is safe.

No contributor may merge their own substantial change without another
qualified review. Rules changes require rules-focused review. Community-track
pull requests require `status:approved`.

### Planning and releases

Work is tracked issue-first. Milestones are completed in order:
`v0.1 Foundations`, `v0.2 Editor`, `v0.3 Fabrication`,
`v0.4 PublicWorkflow`, then `v1.0 Release`. Each milestone has an epic;
dependencies use `Blocked by`, branches include the issue number, and pull
requests use `Closes #N`.

The `RescueSketch` project tracks Status, Priority, Area, Target, Estimate, and
Rules impact. Releases use semantic versioning, Conventional Commits, required
checks, review, and squash merge.

### Changes to governance

Changes to this document require a dedicated issue, a public comment period of
at least seven days, and approval by the lead maintainer plus one other
maintainer when one is active.

## Español

### Principios

RescueSketch se gobierna públicamente priorizando seguridad, fidelidad y
trazabilidad al reglamento inglés vigente, accesibilidad y medidas físicas
reproducibles, y mantenimiento open source sostenible y acogedor. Es un
proyecto independiente y no puede emitir decisiones oficiales de RoboCup.

### Roles

- **Personas usuarias:** usan el software y entregan retroalimentación.
- **Contributors:** aportan issues, pistas, documentación, código o
  traducciones bajo la licencia aplicable.
- **Reviewers:** aportan revisión técnica o de dominio, sin permiso de merge
  automático.
- **Maintainers:** priorizan, publican releases, protegen la seguridad,
  aprueban pistas y fusionan cambios.
- **Lead maintainer:** `@eeminionn` tiene responsabilidad final sobre accesos,
  releases y decisiones no resueltas.

Los roles se obtienen mediante trabajo sostenido y constructivo. Las
nominaciones se conversan entre maintainers y luego se anuncian públicamente.
Una persona inactiva puede pasar a estado emeritus tras un intento documentado
de contacto.

### Decisiones

Las decisiones habituales usan consenso tácito en el issue o pull request.
Cambios importantes de arquitectura, licencia, datos, interpretación
reglamentaria o gobernanza requieren discusión pública, alternativas
documentadas y aprobación explícita.

Sin consenso, quienes mantienen deciden según los principios anteriores. El
lead maintainer resuelve empates y documenta el motivo. Una respuesta urgente
de seguridad puede mantenerse privada hasta que divulgar sea seguro.

Nadie debe fusionar su propio cambio sustancial sin otra revisión calificada.
Los cambios reglamentarios requieren revisión de reglas y las pistas
comunitarias requieren `status:approved`.

### Planificación y releases

El trabajo comienza en un issue. Los milestones se completan en orden:
`v0.1 Foundations`, `v0.2 Editor`, `v0.3 Fabrication`,
`v0.4 PublicWorkflow` y `v1.0 Release`. Cada milestone tiene un epic; las
dependencias usan `Blocked by`, las ramas incluyen el issue y los pull requests
usan `Closes #N`.

El proyecto `RescueSketch` registra Status, Priority, Area, Target, Estimate y
Rules impact. Los releases siguen versionado semántico, Conventional Commits,
checks requeridos, revisión y squash merge.

### Cambios de gobernanza

Modificar este documento requiere un issue dedicado, al menos siete días de
comentarios públicos y aprobación del lead maintainer más otro maintainer
cuando exista uno activo.
