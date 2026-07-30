# Security Policy / Política de seguridad

## Supported versions / Versiones con soporte

Until `v1.0`, only the latest commit on `main` and the latest published
pre-release receive security fixes. After `v1.0`, this table will identify
supported release lines.

Hasta `v1.0`, solo el último commit de `main` y la última pre-release publicada
reciben correcciones de seguridad. Después de `v1.0`, esta tabla identificará
las líneas con soporte.

| Version                  | Supported |
| ------------------------ | --------- |
| `main`                   | Yes       |
| Latest `0.x` pre-release | Yes       |
| Older builds             | No        |

## Reporting a vulnerability / Reportar una vulnerabilidad

**Do not open a public issue, discussion, or pull request.**
**No abras un issue, discusión o pull request público.**

Use GitHub's private vulnerability reporting:

<https://github.com/eeminionn/rescueSketch/security/advisories/new>

If private reporting is unavailable, contact `@eeminionn` through a private
contact method listed on their GitHub profile. Share only enough information
in public to request a private channel.

Si el reporte privado no está disponible, contacta a `@eeminionn` mediante un
canal privado publicado en su perfil de GitHub. Comparte en público únicamente
lo necesario para solicitar un canal privado.

Include:

- affected version or commit;
- impact and attack scenario;
- minimal reproduction or proof of concept;
- whether credentials or user data may be exposed;
- suggested mitigation, if known;
- a safe way to contact you.

Incluye versión o commit, impacto, reproducción mínima, posible exposición de
credenciales o datos, mitigación conocida y un canal seguro de contacto.

## Response and disclosure / Respuesta y divulgación

Maintainers aim to acknowledge a complete report within three business days
and provide a status update within fourteen days. These are targets, not
guarantees. Please allow a reasonable remediation window before disclosure.
The project will credit reporters who request attribution and will not credit
anyone who prefers anonymity.

Quienes mantienen el proyecto intentarán confirmar un reporte completo en tres
días hábiles y actualizar su estado en catorce días. Son objetivos, no
garantías. Solicitamos un plazo razonable de corrección antes de divulgar. Se
reconocerá a quien lo solicite y se respetará el anonimato.

Relevant scope includes the web client, Supabase functions and RLS, GitHub App
integration, public-track save workflow, export pipeline, and repository
automation. Reports about RoboCup rules themselves are not security issues;
use the rules discrepancy form.
