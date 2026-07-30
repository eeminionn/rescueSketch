import { rescueSketchCatalog } from '../../catalog';
import type { RulesetEntry, TrackDocumentV1, TrackStructure, TrackTile } from '../../domain';
import { getRescueLine2026Rule } from '../../rules';
import {
  createValidationFinding,
  sortValidationFindings,
  type ValidationFinding,
} from '../validationTypes';

const fieldTileCatalogItemIds = new Set(
  rescueSketchCatalog.items.filter(({ kind }) => kind === 'tile').map(({ id }) => id),
);

function getNumericRule(ruleId: string): { rule: RulesetEntry; value: number } {
  const rule = getRescueLine2026Rule(ruleId);

  if (typeof rule.value !== 'number') {
    throw new TypeError(`Expected ${ruleId} to contain a numeric ruleset value.`);
  }

  return { rule, value: rule.value };
}

function getBooleanRule(ruleId: string): { rule: RulesetEntry; value: boolean } {
  const rule = getRescueLine2026Rule(ruleId);

  if (typeof rule.value !== 'boolean') {
    throw new TypeError(`Expected ${ruleId} to contain a boolean ruleset value.`);
  }

  return { rule, value: rule.value };
}

function isFieldTile(tile: TrackTile): boolean {
  return fieldTileCatalogItemIds.has(tile.catalogItemId);
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${String(count)} ${count === 1 ? singular : plural}`;
}

function validateMinimumCourseTiles(document: TrackDocumentV1): ValidationFinding[] {
  const { rule, value: minimumCourseTiles } = getNumericRule('field.minimumCourseTiles');
  const fieldTileCount = document.tiles.filter(
    (tile) => isFieldTile(tile) && tile.catalogItemId !== 'goalTile',
  ).length;
  const courseTileCount = Math.max(0, fieldTileCount - 1);

  if (courseTileCount >= minimumCourseTiles) {
    return [];
  }

  return [
    createValidationFinding({
      id: 'track:field.minimumCourseTiles',
      severity: 'error',
      elementId: 'track',
      messages: {
        es: `La pista contiene ${formatCount(courseTileCount, 'baldosa', 'baldosas')} de recorrido; se requieren al menos ${minimumCourseTiles}, sin contar una baldosa de inicio ni la meta.`,
        en: `The course contains ${formatCount(courseTileCount, 'course tile', 'course tiles')}; at least ${minimumCourseTiles} are required, excluding one start tile and the goal.`,
      },
      rule,
      suggestedCorrection: {
        es: `Añade ${formatCount(minimumCourseTiles - courseTileCount, 'baldosa', 'baldosas')} de recorrido antes de la meta.`,
        en: `Add ${formatCount(minimumCourseTiles - courseTileCount, 'course tile', 'course tiles')} before the goal.`,
      },
      actualValue: courseTileCount,
      expectedValue: minimumCourseTiles,
    }),
  ];
}

function validateVictimCounts(document: TrackDocumentV1): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const { rule: livingRule, value: expectedLivingCount } = getNumericRule('victim.livingCount');
  const { rule: deadRule, value: expectedDeadCount } = getNumericRule('victim.deadCount');
  const livingCount = document.tiles.filter(
    ({ catalogItemId }) => catalogItemId === 'livingVictim',
  ).length;
  const deadCount = document.tiles.filter(
    ({ catalogItemId }) => catalogItemId === 'deadVictim',
  ).length;

  if (livingCount !== expectedLivingCount) {
    findings.push(
      createValidationFinding({
        id: 'track:victim.livingCount',
        severity: 'error',
        elementId: 'track',
        messages: {
          es: `La pista contiene ${formatCount(livingCount, 'víctima viva', 'víctimas vivas')}; el reglamento especifica ${expectedLivingCount}.`,
          en: `The course contains ${formatCount(livingCount, 'living victim', 'living victims')}; the rules specify ${expectedLivingCount}.`,
        },
        rule: livingRule,
        suggestedCorrection: {
          es: `Ajusta la pista para que contenga exactamente ${expectedLivingCount} víctimas vivas.`,
          en: `Adjust the course so it contains exactly ${expectedLivingCount} living victims.`,
        },
        actualValue: livingCount,
        expectedValue: expectedLivingCount,
      }),
    );
  }

  if (deadCount !== expectedDeadCount) {
    findings.push(
      createValidationFinding({
        id: 'track:victim.deadCount',
        severity: 'error',
        elementId: 'track',
        messages: {
          es: `La pista contiene ${formatCount(deadCount, 'víctima muerta', 'víctimas muertas')}; el reglamento especifica ${expectedDeadCount}.`,
          en: `The course contains ${formatCount(deadCount, 'dead victim', 'dead victims')}; the rules specify ${expectedDeadCount}.`,
        },
        rule: deadRule,
        suggestedCorrection: {
          es: `Ajusta la pista para que contenga exactamente ${expectedDeadCount} víctima muerta.`,
          en: `Adjust the course so it contains exactly ${expectedDeadCount} dead victim.`,
        },
        actualValue: deadCount,
        expectedValue: expectedDeadCount,
      }),
    );
  }

  return findings;
}

function validateTileBooleanRule(
  tile: TrackTile,
  parameterId: string,
  ruleId: string,
  messages: { es: string; en: string },
  suggestedCorrection: { es: string; en: string },
): ValidationFinding[] {
  const { rule, value: expectedValue } = getBooleanRule(ruleId);
  const actualValue = tile.parameters[parameterId];

  if (typeof actualValue !== 'boolean' || actualValue === expectedValue) {
    return [];
  }

  return [
    createValidationFinding({
      id: `${tile.id}:${ruleId}`,
      severity: 'error',
      elementId: tile.id,
      messages,
      rule,
      suggestedCorrection,
      actualValue,
      expectedValue,
    }),
  ];
}

function validateTileContext(document: TrackDocumentV1): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const tile of document.tiles) {
    const catalogItem = rescueSketchCatalog.items.find(({ id }) => id === tile.catalogItemId);

    if (catalogItem?.category === 'intersection') {
      findings.push(
        ...validateTileBooleanRule(
          tile,
          'allowedInEvacuation',
          'intersection.allowedInEvacuation',
          {
            es: 'La intersección está declarada dentro de la zona de evacuación.',
            en: 'The intersection is declared to be inside the evacuation zone.',
          },
          {
            es: 'Mueve la intersección fuera de la zona de evacuación.',
            en: 'Move the intersection outside the evacuation zone.',
          },
        ),
      );
    } else if (tile.catalogItemId === 'evacuationEntrance') {
      findings.push(
        ...validateTileBooleanRule(
          tile,
          'lineEndsAtEntrance',
          'evacuation.lineEndsAtEntrance',
          {
            es: 'La entrada declara que la línea negra no termina allí.',
            en: 'The entrance declares that the black line does not end there.',
          },
          {
            es: 'Haz terminar la línea negra en la entrada de evacuación.',
            en: 'End the black line at the evacuation entrance.',
          },
        ),
      );
    } else if (tile.catalogItemId === 'evacuationExit') {
      findings.push(
        ...validateTileBooleanRule(
          tile,
          'lineResumesAtExit',
          'evacuation.lineResumesAtExit',
          {
            es: 'La salida declara que la línea negra no vuelve a comenzar allí.',
            en: 'The exit declares that the black line does not resume there.',
          },
          {
            es: 'Haz comenzar nuevamente la línea negra en la salida de evacuación.',
            en: 'Resume the black line at the evacuation exit.',
          },
        ),
      );
    }
  }

  return findings;
}

function validateRamp(structure: TrackStructure): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const immediatePeakAllowed = structure.parameters.immediatePeakAllowed;
  const { rule: immediatePeakRule, value: expectedImmediatePeakAllowed } = getBooleanRule(
    'ramp.immediatePeakAllowed',
  );

  if (
    typeof immediatePeakAllowed === 'boolean' &&
    immediatePeakAllowed !== expectedImmediatePeakAllowed
  ) {
    findings.push(
      createValidationFinding({
        id: `${structure.id}:ramp.immediatePeakAllowed`,
        severity: 'error',
        elementId: structure.id,
        messages: {
          es: 'La rampa declara que permite un pico inmediatamente después de su término.',
          en: 'The ramp declares that an immediate peak is allowed after its end.',
        },
        rule: immediatePeakRule,
        suggestedCorrection: {
          es: 'Configura la transición para que no exista un pico inmediato.',
          en: 'Configure the transition so that no immediate peak is present.',
        },
        actualValue: immediatePeakAllowed,
        expectedValue: expectedImmediatePeakAllowed,
      }),
    );
  }

  return findings;
}

function validateSeesaw(structure: TrackStructure): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const lineMustBeStraight = structure.parameters.lineMustBeStraight;
  const { rule: straightLineRule, value: expectedStraightLine } = getBooleanRule(
    'seesaw.lineMustBeStraight',
  );

  if (typeof lineMustBeStraight === 'boolean' && lineMustBeStraight !== expectedStraightLine) {
    findings.push(
      createValidationFinding({
        id: `${structure.id}:seesaw.lineMustBeStraight`,
        severity: 'error',
        elementId: structure.id,
        messages: {
          es: 'El balancín declara una línea que no es recta.',
          en: 'The seesaw declares a line that is not straight.',
        },
        rule: straightLineRule,
        suggestedCorrection: {
          es: 'Usa una línea recta continua sobre el balancín.',
          en: 'Use one continuous straight line across the seesaw.',
        },
        actualValue: lineMustBeStraight,
        expectedValue: expectedStraightLine,
      }),
    );
  }

  const scoringElementsAllowed = structure.parameters.scoringElementsAllowed;
  const { rule: scoringRule, value: expectedScoringElementsAllowed } = getBooleanRule(
    'seesaw.scoringElementsAllowed',
  );

  if (
    typeof scoringElementsAllowed === 'boolean' &&
    scoringElementsAllowed !== expectedScoringElementsAllowed
  ) {
    findings.push(
      createValidationFinding({
        id: `${structure.id}:seesaw.scoringElementsAllowed`,
        severity: 'error',
        elementId: structure.id,
        messages: {
          es: 'El balancín declara otros elementos puntuables en su superficie.',
          en: 'The seesaw declares other scoring elements on its surface.',
        },
        rule: scoringRule,
        suggestedCorrection: {
          es: 'Retira los demás elementos puntuables del balancín.',
          en: 'Remove all other scoring elements from the seesaw.',
        },
        actualValue: scoringElementsAllowed,
        expectedValue: expectedScoringElementsAllowed,
      }),
    );
  }

  return findings;
}

function validateLevelStructures(document: TrackDocumentV1): ValidationFinding[] {
  return document.structures.flatMap((structure) => {
    if (structure.kind === 'ramp') {
      return validateRamp(structure);
    }

    if (structure.kind === 'seesaw') {
      return validateSeesaw(structure);
    }

    return [];
  });
}

export function validateDocumentRules(document: TrackDocumentV1): ValidationFinding[] {
  return sortValidationFindings([
    ...validateMinimumCourseTiles(document),
    ...validateVictimCounts(document),
    ...validateTileContext(document),
    ...validateLevelStructures(document),
  ]);
}
