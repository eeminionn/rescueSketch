import { getCatalogItem } from '../../catalog';
import type { TrackDocumentV1, TrackTile } from '../../domain';
import { getRescueLine2026Rule } from '../../rules';
import {
  createValidationFinding,
  sortValidationFindings,
  type ValidationFinding,
} from '../validationTypes';

function compareIds(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function isRouteTile(tile: TrackTile): boolean {
  try {
    const item = getCatalogItem(tile.catalogItemId);

    return (
      item.category === 'line' ||
      item.category === 'intersection' ||
      tile.catalogItemId === 'evacuationEntrance' ||
      tile.catalogItemId === 'evacuationExit'
    );
  } catch {
    return false;
  }
}

function isCatalogCategory(tile: TrackTile, category: string): boolean {
  try {
    return getCatalogItem(tile.catalogItemId).category === category;
  } catch {
    return false;
  }
}

function createFinding(
  input: Omit<Parameters<typeof createValidationFinding>[0], 'rule'> & {
    ruleId: string;
  },
): ValidationFinding {
  const { ruleId, ...finding } = input;

  return createValidationFinding({
    ...finding,
    rule: getRescueLine2026Rule(ruleId),
  });
}

function addMissingBooleanEvidenceFinding(
  findings: ValidationFinding[],
  element: Pick<TrackTile, 'id' | 'parameters'>,
  input: {
    parameterId: string;
    ruleId: string;
    messages: { es: string; en: string };
    suggestedCorrection: { es: string; en: string };
  },
): void {
  const rule = getRescueLine2026Rule(input.ruleId);

  if (typeof rule.value !== 'boolean') {
    throw new TypeError(`Expected ${input.ruleId} to contain a boolean ruleset value.`);
  }

  const declaredEvidence = element.parameters[input.parameterId];

  if (typeof declaredEvidence === 'boolean') {
    return;
  }

  findings.push(
    createFinding({
      id: `manual.${element.id}.${input.ruleId}.contextEvidence`,
      severity: 'manual',
      elementId: element.id,
      ruleId: input.ruleId,
      messages: input.messages,
      suggestedCorrection: input.suggestedCorrection,
      actualValue: 'missing',
      expectedValue: rule.value,
    }),
  );
}

/**
 * Returns only checks that still require a person to inspect the assembled
 * course or competition-time setup. Numeric parameters that TrackDocumentV1
 * can represent deterministically belong in the automated validator.
 */
export function createManualValidationFindings(document: TrackDocumentV1): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const tiles = [...document.tiles].sort(compareIds);
  const structures = [...document.structures].sort(compareIds);

  if (tiles.length > 1) {
    const rule = getRescueLine2026Rule('floor.tileStepHeightMaxMm');

    findings.push(
      createFinding({
        id: 'manual.track.floorTileStep',
        severity: 'manual',
        elementId: 'track',
        ruleId: rule.id,
        messages: {
          es: `La geometría digital no representa desniveles entre piezas. Comprueba físicamente que cada unión entre baldosas no supere ${String(rule.value)} mm.`,
          en: `Digital geometry does not represent steps between pieces. Physically confirm that every tile joint does not exceed ${String(rule.value)} mm.`,
        },
        suggestedCorrection: {
          es: 'Nivela, lija o calza las uniones después de montar la pista completa.',
          en: 'Level, sand, or shim the joints after assembling the complete course.',
        },
        expectedValue: rule.value,
      }),
    );
  }

  if (tiles.some(isRouteTile)) {
    const rule = getRescueLine2026Rule('line.clearanceMinMm');

    findings.push(
      createFinding({
        id: 'manual.track.lineClearanceAndContinuity',
        severity: 'manual',
        elementId: 'track',
        ruleId: rule.id,
        messages: {
          es: `La continuidad en uniones físicas y la separación respecto de objetos no pueden inferirse con seguridad. Comprueba el recorrido armado y una separación mínima de ${String(rule.value)} mm.`,
          en: `Continuity across physical joints and clearance from objects cannot be inferred safely. Check the assembled route and a minimum clearance of ${String(rule.value)} mm.`,
        },
        suggestedCorrection: {
          es: 'Mide todo el recorrido montado, alinea las uniones y mueve cualquier borde u objeto demasiado cercano.',
          en: 'Measure the complete assembled route, align its joints, and move any edge or object that is too close.',
        },
        expectedValue: rule.value,
      }),
    );
  }

  for (const debris of structures.filter(({ kind }) => kind === 'debris')) {
    const rule = getRescueLine2026Rule('debris.heightMaxMm');

    findings.push(
      createFinding({
        id: `manual.${debris.id}.debrisHeight`,
        severity: 'manual',
        elementId: debris.id,
        ruleId: rule.id,
        messages: {
          es: `La altura real de cada pieza de escombro debe medirse antes del montaje y no superar ${String(rule.value)} mm.`,
          en: `The physical height of every debris piece must be measured before assembly and must not exceed ${String(rule.value)} mm.`,
        },
        suggestedCorrection: {
          es: 'Mide la pieza más alta con un calibre y reemplaza cualquier pieza que exceda el límite.',
          en: 'Measure the tallest piece with callipers and replace any piece that exceeds the limit.',
        },
        expectedValue: rule.value,
      }),
    );
  }

  for (const obstacle of structures.filter(({ kind }) => kind === 'obstacle')) {
    for (const [ruleId, context] of [
      [
        'obstacle.edgeClearanceMinMm',
        {
          es: 'fuera de evacuación, respecto de bordes e inclinaciones',
          en: 'outside evacuation, from field edges and inclines',
        },
      ],
      [
        'obstacle.evacuationWallClearanceMinMm',
        {
          es: 'dentro de evacuación, respecto de sus paredes',
          en: 'inside evacuation, from its walls',
        },
      ],
    ] as const) {
      const rule = getRescueLine2026Rule(ruleId);

      findings.push(
        createFinding({
          id: `manual.${obstacle.id}.${ruleId}`,
          severity: 'manual',
          elementId: obstacle.id,
          ruleId,
          messages: {
            es: `El contexto físico del obstáculo requiere medición: ${context.es}, confirma al menos ${String(rule.value)} mm.`,
            en: `The obstacle's physical context requires measurement: ${context.en}, confirm at least ${String(rule.value)} mm.`,
          },
          suggestedCorrection: {
            es: 'Determina si el obstáculo está dentro de evacuación y aplica la separación correspondiente después del montaje.',
            en: 'Determine whether the obstacle is inside evacuation and apply the corresponding clearance after assembly.',
          },
          expectedValue: rule.value,
        }),
      );
    }
  }

  for (const ramp of structures.filter(({ kind }) => kind === 'ramp')) {
    addMissingBooleanEvidenceFinding(findings, ramp, {
      parameterId: 'immediatePeakAllowed',
      ruleId: 'ramp.immediatePeakAllowed',
      messages: {
        es: 'El boceto no confirma una transición física nivelada al terminar la rampa. Revisa que una subida no termine inmediatamente en una bajada, ni viceversa.',
        en: 'The sketch does not confirm a level physical transition at the end of the ramp. Check that an ascent does not end immediately in a descent, or vice versa.',
      },
      suggestedCorrection: {
        es: 'Intercala una superficie nivelada entre cambios opuestos de pendiente, comprueba el perfil lateral y registra la confirmación en la pieza.',
        en: 'Insert a level surface between opposite slope changes, inspect the side profile, and record the confirmation on the piece.',
      },
    });
  }

  for (const seesaw of structures.filter(({ kind }) => kind === 'seesaw')) {
    addMissingBooleanEvidenceFinding(findings, seesaw, {
      parameterId: 'lineMustBeStraight',
      ruleId: 'seesaw.lineMustBeStraight',
      messages: {
        es: 'El boceto no aporta evidencia suficiente para confirmar que la línea del balancín sea recta y continua.',
        en: 'The sketch does not provide enough evidence to confirm that the seesaw line is straight and continuous.',
      },
      suggestedCorrection: {
        es: 'Inspecciona la línea montada de extremo a extremo y registra la confirmación en la pieza.',
        en: 'Inspect the assembled line from end to end and record the confirmation on the piece.',
      },
    });
    addMissingBooleanEvidenceFinding(findings, seesaw, {
      parameterId: 'scoringElementsAllowed',
      ruleId: 'seesaw.scoringElementsAllowed',
      messages: {
        es: 'El boceto no aporta evidencia suficiente para confirmar que la baldosa de balancín esté libre de otros elementos puntuables.',
        en: 'The sketch does not provide enough evidence to confirm that the seesaw tile is free of other scoring elements.',
      },
      suggestedCorrection: {
        es: 'Inspecciona la baldosa completa, retira cualquier elemento puntuable adicional y registra la confirmación.',
        en: 'Inspect the complete tile, remove every additional scoring element, and record the confirmation.',
      },
    });
  }

  for (const intersection of tiles.filter((tile) => isCatalogCategory(tile, 'intersection'))) {
    addMissingBooleanEvidenceFinding(findings, intersection, {
      parameterId: 'allowedInEvacuation',
      ruleId: 'intersection.allowedInEvacuation',
      messages: {
        es: 'La relación espacial del boceto no basta para confirmar que esta intersección quede fuera de la zona de evacuación.',
        en: 'The sketch spatial relationship is not sufficient to confirm that this intersection remains outside the evacuation zone.',
      },
      suggestedCorrection: {
        es: 'Comprueba la ubicación respecto de los muros de evacuación y registra que la intersección está fuera de la zona.',
        en: 'Check the location against the evacuation walls and record that the intersection is outside the zone.',
      },
    });
  }

  for (const entrance of tiles.filter(
    ({ catalogItemId }) => catalogItemId === 'evacuationEntrance',
  )) {
    addMissingBooleanEvidenceFinding(findings, entrance, {
      parameterId: 'lineEndsAtEntrance',
      ruleId: 'evacuation.lineEndsAtEntrance',
      messages: {
        es: 'El boceto no confirma que la línea negra termine físicamente en la entrada de evacuación.',
        en: 'The sketch does not confirm that the black line physically ends at the evacuation entrance.',
      },
      suggestedCorrection: {
        es: 'Inspecciona la unión con la cinta de entrada, corrige cualquier prolongación y registra la confirmación.',
        en: 'Inspect the entrance-tape junction, correct any continuation, and record the confirmation.',
      },
    });
  }

  for (const exit of tiles.filter(({ catalogItemId }) => catalogItemId === 'evacuationExit')) {
    addMissingBooleanEvidenceFinding(findings, exit, {
      parameterId: 'lineResumesAtExit',
      ruleId: 'evacuation.lineResumesAtExit',
      messages: {
        es: 'El boceto no confirma que la línea negra vuelva a comenzar físicamente en la salida de evacuación.',
        en: 'The sketch does not confirm that the black line physically resumes at the evacuation exit.',
      },
      suggestedCorrection: {
        es: 'Inspecciona la unión con la cinta de salida, alinea el reinicio y registra la confirmación.',
        en: 'Inspect the exit-tape junction, align the resumed line, and record the confirmation.',
      },
    });
  }

  const livingVictims = tiles.filter(({ catalogItemId }) => catalogItemId === 'livingVictim');
  const deadVictims = tiles.filter(({ catalogItemId }) => catalogItemId === 'deadVictim');
  const victimTiles = [...livingVictims, ...deadVictims].sort(compareIds);
  const hasVictimSetup =
    victimTiles.length > 0 || structures.some(({ kind }) => kind === 'evacuationZone');

  for (const victim of victimTiles) {
    for (const [ruleId, messages, suggestedCorrection] of [
      [
        'victim.diameterMinMm',
        {
          es: 'El diámetro físico de cada víctima debe comprobarse manualmente contra el mínimo reglamentario.',
          en: 'The physical diameter of every victim must be checked manually against the rules minimum.',
        },
        {
          es: 'Mide cada esfera en varios ejes con un calibre y reemplaza las que sean demasiado pequeñas.',
          en: 'Measure every sphere on several axes with callipers and replace any that is too small.',
        },
      ],
      [
        'victim.diameterMaxMm',
        {
          es: 'El diámetro físico de cada víctima debe comprobarse manualmente contra el máximo reglamentario.',
          en: 'The physical diameter of every victim must be checked manually against the rules maximum.',
        },
        {
          es: 'Mide cada esfera en varios ejes con un calibre y reemplaza las que sean demasiado grandes.',
          en: 'Measure every sphere on several axes with callipers and replace any that is too large.',
        },
      ],
      [
        'victim.weightMaxGram',
        {
          es: 'El peso físico de cada víctima no puede verificarse a partir del boceto.',
          en: 'The physical weight of every victim cannot be verified from the sketch.',
        },
        {
          es: 'Pesa cada esfera en una balanza calibrada antes de utilizarla.',
          en: 'Weigh every sphere on a calibrated scale before using it.',
        },
      ],
    ] as const) {
      const rule = getRescueLine2026Rule(ruleId);

      findings.push(
        createFinding({
          id: `manual.${victim.id}.${ruleId}`,
          severity: 'manual',
          elementId: victim.id,
          ruleId,
          messages: {
            es: `${messages.es} Valor de referencia: ${String(rule.value)} ${rule.unit}.`,
            en: `${messages.en} Reference value: ${String(rule.value)} ${rule.unit}.`,
          },
          suggestedCorrection,
          expectedValue: rule.value,
        }),
      );
    }
  }

  if (hasVictimSetup) {
    findings.push(
      createFinding({
        id: 'manual.track.victimRandomPlacement',
        severity: 'manual',
        elementId: 'track',
        ruleId: 'victim.randomPlacement',
        messages: {
          es: 'La ubicación final de las víctimas debe determinarse aleatoriamente durante la preparación física; el boceto no fija ese sorteo.',
          en: 'Final victim locations must be randomized during physical setup; the sketch does not fix that draw.',
        },
        suggestedCorrection: {
          es: 'Sortea y registra las posiciones durante la preparación final, independientemente de las posiciones mostradas en el boceto.',
          en: 'Randomize and record the positions during final setup, independently of the positions shown in the sketch.',
        },
        expectedValue: true,
      }),
    );
  }

  const uniqueFindings = new Map(findings.map((finding) => [finding.id, finding]));

  return sortValidationFindings([...uniqueFindings.values()]);
}
