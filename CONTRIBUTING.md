# Contributing to RescueSketch / Contribuir a RescueSketch

Thank you for helping make Rescue Line field design easier to build and audit.
Gracias por ayudar a que el diseño de pistas Rescue Line sea más fácil de
construir y revisar.

By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Security reports must follow
[SECURITY.md](SECURITY.md), not a public issue.

## English

### Before you start

1. Search existing issues and discussions.
2. Use a matching Issue Form. Rules corrections must use the rules
   discrepancy form and cite the exact English source.
3. Wait for scope agreement before a large architectural or user-experience
   change. Small, well-bounded fixes may start immediately.
4. Never include secrets, personal data, copied official artwork, or material
   you are not authorized to license.

### Required workflow

Every product change follows:

1. **Issue:** define outcome, acceptance criteria, rules impact, and
   dependencies.
2. **Branch:** create a kebab-case branch that includes the issue number, for
   example `feat/123-canvas-snap`.
3. **Implementation:** keep the change focused and add tests and translations.
4. **Verification:** run lint, type checks, tests, and the production build.
5. **Pull request:** use the template and include `Closes #123`.
6. **Review:** address feedback; maintainers apply `status:approved` to
   community-track submissions.
7. **Merge:** use squash merge after required checks pass.

Do not work around a failing required check. Explain unavoidable test gaps in
the pull request.

### Naming and style

- Brand, React components, classes, enums, and TypeScript types use
  `PascalCase`: `RescueSketch`, `TrackEditor`, `TrackDocumentV1`.
- Variables, functions, hooks, modules, object properties, JSON fields, and
  API names use `camelCase`: `savePublicTrack`, `useTrackStore`,
  `rulesetVersion`.
- PostgreSQL identifiers use `snake_case`.
- Routes, branches, workflow files, and platform-defined filenames use
  `kebab-case` where supported.
- User-visible strings belong in the i18n catalog in both English and Spanish.
- Measurements are stored in millimetres. Derived values are calculated, not
  duplicated in persisted documents.

Commits and pull request titles use
[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(editor): add keyboard tile rotation
fix(rules): enforce the maximum line gap
docs(contributing): clarify rules citations
content(track): update example-track
```

Use the imperative mood, keep the subject concise, and add `BREAKING CHANGE:`
in the footer when appropriate.

### Rules changes

A rules-related change must:

- cite title/revision, section, page, and the exact English concept being
  implemented;
- classify the check as automatic, advisory, or manual;
- update positive and negative fixtures;
- update both languages without presenting the Spanish paraphrase as official;
- avoid copying pages, logos, or diagrams;
- explain any ambiguity instead of inventing a requirement.

At least one rules-focused maintainer review is required before merge.

### Community tracks

Files under `communityTracks/` are public and licensed CC BY 4.0. Submit only
your own track or one you are authorized to publish. The application injects
verified authorship and licence metadata; do not edit those fields to
impersonate another person. A community-track PR requires the maintainer label
`status:approved`.

### Local checks

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Add or update tests proportionally to risk. Visual changes need screenshots
for desktop and tablet; interaction changes need keyboard coverage and an
accessibility check.

## Español

### Antes de comenzar

1. Busca issues y discusiones existentes.
2. Usa el formulario correspondiente. Las correcciones reglamentarias deben
   usar el formulario de discrepancia y citar la fuente inglesa exacta.
3. Espera un acuerdo de alcance antes de un cambio grande de arquitectura o
   experiencia. Las correcciones pequeñas y acotadas pueden comenzar de
   inmediato.
4. Nunca incluyas secretos, datos personales, arte oficial copiado ni material
   que no estés autorizado a licenciar.

### Flujo obligatorio

Todo cambio de producto sigue:

1. **Issue:** define resultado, aceptación, impacto reglamentario y
   dependencias.
2. **Rama:** usa kebab-case e incluye el número, por ejemplo
   `feat/123-canvas-snap`.
3. **Implementación:** mantén el cambio acotado y añade pruebas y traducciones.
4. **Verificación:** ejecuta lint, tipos, pruebas y build de producción.
5. **Pull request:** completa la plantilla e incluye `Closes #123`.
6. **Revisión:** resuelve observaciones; maintainers aplican
   `status:approved` a las pistas comunitarias.
7. **Merge:** usa squash merge cuando todos los checks requeridos pasen.

No eludas un check requerido. Explica en el pull request cualquier brecha de
pruebas inevitable.

### Nombres y estilo

- Marca, componentes React, clases, enums y tipos TypeScript usan `PascalCase`.
- Variables, funciones, hooks, módulos, propiedades, campos JSON y APIs usan
  `camelCase`.
- Identificadores PostgreSQL usan `snake_case`.
- Rutas, ramas, workflows y nombres definidos por plataforma usan
  `kebab-case` cuando corresponda.
- Todo texto visible pertenece al catálogo i18n en inglés y español.
- Las medidas se almacenan en milímetros y los valores derivados se calculan.

Los commits y títulos de pull request siguen Conventional Commits. Usa modo
imperativo, un asunto breve y el pie `BREAKING CHANGE:` cuando corresponda.

### Cambios reglamentarios

Un cambio reglamentario debe citar revisión, sección, página y concepto inglés;
clasificar la validación; actualizar fixtures positivos y negativos; mantener
ambos idiomas; evitar copiar material oficial y documentar ambigüedades sin
inventar requisitos. Requiere al menos una revisión enfocada en reglas.

### Pistas comunitarias

Los archivos en `communityTracks/` son públicos y CC BY 4.0. Publica solo
material propio o autorizado. No manipules autoría ni licencia. Cada pull
request de pistas necesita la etiqueta mantenedora `status:approved`.

### Comprobaciones locales

Ejecuta los comandos de la sección inglesa. Los cambios visuales necesitan
capturas de escritorio y tablet; los cambios de interacción necesitan
cobertura de teclado y una comprobación de accesibilidad.
