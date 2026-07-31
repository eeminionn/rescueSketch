# RescueSketch

**[Español](#español) · [English](#english)**

RescueSketch is a community-first, bilingual track designer for
RoboCupJunior Rescue Line 2026. It turns a track sketch into a
millimetre-based construction plan while keeping every automated rule check
traceable to its source.

> [!IMPORTANT]
> RescueSketch is an independent, unofficial community project. It is not
> affiliated with, endorsed by, or certified by RoboCup, the RoboCup
> Federation, or a RoboCupJunior committee. A design that passes RescueSketch
> validation is **not** a guarantee of competition approval. The current
> official English rules and event officials always take precedence.

## Español

### ¿Qué es RescueSketch?

RescueSketch permite diseñar pistas de Rescue Line como un rompecabezas:
arrastra baldosas y elementos a un lienzo SVG, ajusta sus parámetros y obtén
medidas que puedas trasladar a madera. El proyecto está pensado para equipos,
mentores, constructores y organizadores.

La versión `v1.0` está planificada con:

- un editor de precisión en milímetros para escritorio y tablet;
- catálogo de líneas, intersecciones, peligros, rampas, niveles, balancín y
  zona de evacuación;
- historial, recuperación local, teclado, arrastrar y soltar, y validación
  bilingüe;
- cotas, radios, longitudes, inventario y exportación JSON, SVG, PNG, PDF y
  DXF;
- inicio de sesión con GitHub mediante Supabase y publicación transparente de
  cada pista comunitaria por pull request.

**Estado:** el editor está publicado en [GitHub Pages](https://eeminionn.github.io/rescueSketch/). Durante las versiones `0.x`, los
esquemas y las interfaces públicas pueden cambiar de forma incompatible.
La versión `v0.2` ya incorpora el dashboard bilingüe, 24 piezas trazables, el
lienzo SVG de 8 × 6 baldosas, niveles, teclado, drag and drop, undo/redo,
inspector contextual y recuperación automática local.

### Base reglamentaria

La línea base es _RoboCupJunior Rescue Line Rules 2026_, actualización
declarada del 29 de marzo de 2026, con SHA-256
`d1a60d29269245a307b0a0023ebdb3c8bca464a2b7616b0482b5bcee5398d9e6`.
Cada valor reglamentario implementado debe conservar sección, página, fuente y
modo de validación. El texto en español es una paráfrasis informativa; el
reglamento inglés es la referencia autoritativa.

RescueSketch recrea sus propias geometrías y explicaciones. No redistribuye
logos, páginas ni diagramas oficiales. Consulta [ATTRIBUTION.md](ATTRIBUTION.md)
para la procedencia y los límites de uso.

### Desarrollo local

Requisitos:

- Node.js 22;
- pnpm mediante Corepack;
- Git.

```bash
corepack enable
pnpm install
pnpm dev
```

Antes de abrir un pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para el flujo issue → rama → pull
request, las reglas de Conventional Commits y las convenciones de nombres.

### Publicación

Cada push a `main` ejecuta `.github/workflows/pages.yml` y publica la aplicación
en GitHub Pages. El editor y las exportaciones funcionan sin credenciales; el
inicio de sesión GitHub/Supabase se activa cuando el repositorio define las
variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` y el
proveedor GitHub tiene configurado el callback de Pages.

### Licencias

| Material                                                                  | Licencia                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| Código fuente y configuración                                             | [MIT](LICENSE)                                  |
| Pistas aportadas en `communityTracks/`                                    | [CC BY 4.0](LICENSES/CC-BY-4.0.txt)             |
| Material explicativo o gráfico adaptado del reglamento y marcado como tal | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt) |

La licencia de terceros no cambia por estar referenciados en este repositorio.
Solo se aplica una licencia Creative Commons a material sobre el que quien
contribuye tenga autoridad para licenciar.

## English

### What is RescueSketch?

RescueSketch lets people design a Rescue Line field as a puzzle: drag tiles
and elements onto an SVG canvas, tune their parameters, and obtain dimensions
that can be transferred to wood. It is intended for teams, mentors, builders,
and organizers.

The planned `v1.0` includes:

- a millimetre-accurate desktop and tablet editor;
- a catalogue of lines, intersections, hazards, ramps, levels, seesaw, and
  evacuation-zone elements;
- history, local recovery, keyboard access, drag and drop, and bilingual
  validation;
- dimensions, radii, lengths, material inventory, and JSON, SVG, PNG, PDF,
  and DXF exports;
- GitHub login through Supabase and transparent publication of each community
  track through a pull request.

**Status:** the editor is live at [GitHub Pages](https://eeminionn.github.io/rescueSketch/). Schemas and public interfaces
may change incompatibly throughout `0.x` releases.
Version `v0.2` already includes the bilingual dashboard, 24 traceable pieces,
the 8 × 6 SVG canvas, levels, keyboard access, drag and drop, undo/redo, the
contextual inspector, and automatic local recovery.

### Rules baseline

The baseline is _RoboCupJunior Rescue Line Rules 2026_, declared update
29 March 2026, SHA-256
`d1a60d29269245a307b0a0023ebdb3c8bca464a2b7616b0482b5bcee5398d9e6`.
Every implemented rules value must retain its section, page, source, and
validation mode. Spanish copy is an informative paraphrase; the English rules
are authoritative.

RescueSketch creates original geometries and explanations. It does not
redistribute official logos, pages, or diagrams. See
[ATTRIBUTION.md](ATTRIBUTION.md) for provenance and usage boundaries.

### Local development

Requirements:

- Node.js 22;
- pnpm through Corepack;
- Git.

```bash
corepack enable
pnpm install
pnpm dev
```

Before opening a pull request:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the issue → branch → pull request
workflow, Conventional Commits rules, and naming conventions.

### Deployment

Every push to `main` runs `.github/workflows/pages.yml` and publishes the app
to GitHub Pages. The editor and exporters work without credentials; GitHub / 
Supabase sign-in is enabled once the repository defines the public
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables and the GitHub
provider has the Pages callback configured.

### Licensing

| Material                                                                  | License                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| Source code and configuration                                             | [MIT](LICENSE)                                  |
| Tracks contributed under `communityTracks/`                               | [CC BY 4.0](LICENSES/CC-BY-4.0.txt)             |
| Rules-derived explanatory or graphical material explicitly marked as such | [CC BY-NC-SA 4.0](LICENSES/CC-BY-NC-SA-4.0.txt) |

Third-party licensing is not changed by a reference in this repository. A
Creative Commons licence applies only to material the contributor has
authority to license.

## Community and project policies

- [Contributing / Contribuir](CONTRIBUTING.md)
- [Governance / Gobernanza](GOVERNANCE.md)
- [Support / Soporte](SUPPORT.md)
- [Security / Seguridad](SECURITY.md)
- [Code of Conduct / Código de conducta](CODE_OF_CONDUCT.md)
- [Attribution / Atribución](ATTRIBUTION.md)

Questions and design proposals belong in
[GitHub Discussions](https://github.com/eeminionn/rescueSketch/discussions).
Actionable bugs and tasks belong in
[GitHub Issues](https://github.com/eeminionn/rescueSketch/issues).
