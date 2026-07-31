import { rescueSketchCatalog, type CatalogItem, type NormativeParameter } from '../../catalog';
import {
  createEmptyTrackDocument,
  parseTrackDocument,
  type RulesetEntry,
  type TrackDocumentV1,
  type TrackStructure,
} from '../../domain';
import { getRescueLine2026Rule } from '../../rules';
import type { ValidationSeverity } from '../validationTypes';
import { validateCatalogParameters } from './catalogParameterValidation';

const acceptedAt = '2026-07-30T18:00:00-04:00';

const structureKinds = [
  'bridge',
  'pillar',
  'ramp',
  'seesaw',
  'evacuationZone',
  'obstacle',
  'speedBump',
  'debris',
  'livingSafePoint',
  'deadSafePoint',
] as const satisfies readonly TrackStructure['kind'][];

type Boundary = 'minimum' | 'maximum' | 'maximumExclusive';

interface BoundaryFixture {
  catalogItem: CatalogItem;
  parameter: NormativeParameter;
  boundary: Boundary;
  boundaryValue: number;
  invalidValue: number;
  expectedRuleId: string;
  expectedSeverity: ValidationSeverity;
}

function isStructureKind(value: string): value is TrackStructure['kind'] {
  return (structureKinds as readonly string[]).includes(value);
}

function createDocument(
  catalogItemId: string,
  parameters: Readonly<Record<string, number | string | boolean>> = {},
): TrackDocumentV1 {
  const document = createEmptyTrackDocument(acceptedAt);
  const commonElement = {
    id: `element-${catalogItemId}`,
    levelId: 'level-0',
    position: { x: 0, y: 0 },
    rotation: 0 as const,
    geometry: [],
    parameters,
  };

  if (isStructureKind(catalogItemId)) {
    return parseTrackDocument({
      ...document,
      structures: [
        {
          ...commonElement,
          kind: catalogItemId,
        },
      ],
    });
  }

  return parseTrackDocument({
    ...document,
    tiles: [
      {
        ...commonElement,
        catalogItemId,
      },
    ],
  });
}

function getExpectedRuleId(
  parameter: NormativeParameter,
  boundary: Boundary,
  boundaryValue: number,
): string {
  const matchingRules = parameter.ruleIds
    .map((ruleId) => getRescueLine2026Rule(ruleId))
    .filter(({ value }) => value === boundaryValue);
  const boundaryName = boundary === 'minimum' ? 'Min' : 'Max';
  const rule = matchingRules.find(({ id }) => id.includes(boundaryName)) ?? matchingRules[0];

  if (rule === undefined) {
    throw new Error(
      `Fixture cannot trace ${parameter.id}.${boundary}=${String(boundaryValue)} to a rule.`,
    );
  }

  return rule.id;
}

function getExpectedSeverity(rule: RulesetEntry): ValidationSeverity {
  if (rule.ruleType === 'advice' || rule.validationMode === 'informational') {
    return 'info';
  }

  if (rule.validationMode === 'manual') {
    return 'manual';
  }

  if (rule.ruleType === 'constructionParameter') {
    return 'warning';
  }

  return 'error';
}

const boundaryFixtures: BoundaryFixture[] = rescueSketchCatalog.items.flatMap((catalogItem) =>
  catalogItem.parameters.normative.flatMap((parameter) => {
    const boundaries: Array<{ boundary: Boundary; boundaryValue: number }> = [];

    if (parameter.minimum !== undefined) {
      boundaries.push({ boundary: 'minimum', boundaryValue: parameter.minimum });
    }

    if (parameter.maximum !== undefined) {
      boundaries.push({ boundary: 'maximum', boundaryValue: parameter.maximum });
    }

    if (parameter.maximumExclusive !== undefined) {
      boundaries.push({
        boundary: 'maximumExclusive',
        boundaryValue: parameter.maximumExclusive,
      });
    }

    return boundaries.map(({ boundary, boundaryValue }) => {
      const expectedRuleId = getExpectedRuleId(parameter, boundary, boundaryValue);

      return {
        catalogItem,
        parameter,
        boundary,
        boundaryValue,
        invalidValue:
          boundary === 'minimum'
            ? boundaryValue - 1
            : boundary === 'maximum'
              ? boundaryValue + 1
              : boundaryValue,
        expectedRuleId,
        expectedSeverity: getExpectedSeverity(getRescueLine2026Rule(expectedRuleId)),
      };
    });
  }),
);

describe('validateCatalogParameters', () => {
  it('accepts catalog defaults for every resolvable tile and structure', () => {
    for (const catalogItem of rescueSketchCatalog.items) {
      expect(validateCatalogParameters(createDocument(catalogItem.id))).toEqual([]);
    }
  });

  it.each(boundaryFixtures)(
    'reports $catalogItem.id.$parameter.id when $boundary is violated',
    ({
      catalogItem,
      parameter,
      boundary,
      boundaryValue,
      invalidValue,
      expectedRuleId,
      expectedSeverity,
    }) => {
      const findings = validateCatalogParameters(
        createDocument(catalogItem.id, { [parameter.id]: invalidValue }),
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        id: `catalogParameter.element-${catalogItem.id}.${parameter.id}.${boundary}`,
        severity: expectedSeverity,
        elementId: `element-${catalogItem.id}`,
        rule: {
          ruleId: expectedRuleId,
        },
        actualValue: invalidValue,
        expectedValue: boundaryValue,
      });
      expect(findings[0]?.messages.es).toContain(parameter.names.es);
      expect(findings[0]?.messages.en).toContain(parameter.names.en);
      expect(findings[0]?.suggestedCorrection.es.length).toBeGreaterThan(0);
      expect(findings[0]?.suggestedCorrection.en.length).toBeGreaterThan(0);
    },
  );

  it('covers every normative catalog parameter and each declared boundary', () => {
    const declaredBoundaryCount = rescueSketchCatalog.items.reduce(
      (catalogTotal, catalogItem) =>
        catalogTotal +
        catalogItem.parameters.normative.reduce(
          (parameterTotal, parameter) =>
            parameterTotal +
            Number(parameter.minimum !== undefined) +
            Number(parameter.maximum !== undefined) +
            Number(parameter.maximumExclusive !== undefined),
          0,
        ),
      0,
    );

    expect(boundaryFixtures).toHaveLength(declaredBoundaryCount);
    expect(boundaryFixtures).toHaveLength(147);
    expect(new Set(boundaryFixtures.map(({ boundary }) => boundary))).toEqual(
      new Set(['minimum', 'maximum', 'maximumExclusive']),
    );
  });

  it('never treats construction parameters or curve radii as normative rules', () => {
    for (const catalogItem of rescueSketchCatalog.items) {
      const constructionOverrides = Object.fromEntries(
        catalogItem.parameters.constructionParameter.map(({ id }) => [id, 1_000_000]),
      );

      expect(
        validateCatalogParameters(createDocument(catalogItem.id, constructionOverrides)),
      ).toEqual([]);
    }

    expect(
      validateCatalogParameters(createDocument('curveLine', { curveRadiusMm: -1_000_000 })),
    ).toEqual([]);
  });

  it('uses defaults only when a numeric normative parameter is absent', () => {
    expect(validateCatalogParameters(createDocument('gapLine'))).toEqual([]);

    for (const invalidValue of ['catalog default', true, false]) {
      const findings = validateCatalogParameters(
        createDocument('gapLine', { gapLengthMm: invalidValue }),
      );

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        id: 'catalogParameter.element-gapLine.gapLengthMm.invalidValue',
        severity: 'error',
        actualValue: invalidValue,
        expectedValue: 150,
        rule: {
          ruleId: 'line.gapLengthMaxMm',
        },
      });
    }
  });

  it.each([
    { configuredValue: Number.NaN, serializedValue: 'NaN' },
    { configuredValue: Number.POSITIVE_INFINITY, serializedValue: 'Infinity' },
    { configuredValue: Number.NEGATIVE_INFINITY, serializedValue: '-Infinity' },
  ])(
    'reports non-finite configured values as blocking findings: $serializedValue',
    ({ configuredValue, serializedValue }) => {
      const document = createDocument('gapLine');
      const unsafeDocument = {
        ...document,
        tiles: [
          {
            ...document.tiles[0]!,
            parameters: {
              gapLengthMm: configuredValue,
            },
          },
        ],
      } as TrackDocumentV1;

      const findings = validateCatalogParameters(unsafeDocument);

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        id: 'catalogParameter.element-gapLine.gapLengthMm.invalidValue',
        severity: 'error',
        actualValue: serializedValue,
        expectedValue: 150,
        rule: {
          ruleId: 'line.gapLengthMaxMm',
        },
      });
    },
  );

  it('keeps advice and manual checks non-blocking while retaining rule traceability', () => {
    const adviceFinding = validateCatalogParameters(
      createDocument('checkpoint', { diameterMm: 71 }),
    );
    const manualFinding = validateCatalogParameters(createDocument('debris', { heightMm: 4 }));

    expect(adviceFinding).toHaveLength(1);
    expect(adviceFinding[0]).toMatchObject({
      severity: 'info',
      rule: {
        ruleId: 'checkpointMarker.diameterMaxMm',
        validationMode: 'informational',
      },
    });
    expect(manualFinding).toHaveLength(1);
    expect(manualFinding[0]).toMatchObject({
      severity: 'manual',
      rule: {
        ruleId: 'debris.heightMaxMm',
        validationMode: 'manual',
      },
    });
  });

  it('skips unresolved tile catalog identifiers without inventing a rule', () => {
    expect(validateCatalogParameters(createDocument('communityPrototype'))).toEqual([]);
  });

  it('sorts findings deterministically by element and rule', () => {
    const document = createEmptyTrackDocument(acceptedAt);
    const findings = validateCatalogParameters(
      parseTrackDocument({
        ...document,
        tiles: [
          {
            id: 'tile-z',
            catalogItemId: 'gapLine',
            levelId: 'level-0',
            position: { x: 0, y: 0 },
            rotation: 0,
            geometry: [],
            parameters: { lineWidthMm: 21, gapLengthMm: 201 },
          },
          {
            id: 'tile-a',
            catalogItemId: 'straightLine',
            levelId: 'level-0',
            position: { x: 300, y: 0 },
            rotation: 0,
            geometry: [],
            parameters: { lineWidthMm: 9 },
          },
        ],
      }),
    );

    expect(findings.map(({ elementId, rule }) => [elementId, rule.ruleId])).toEqual([
      ['tile-a', 'line.widthMinMm'],
      ['tile-z', 'line.gapLengthMaxMm'],
      ['tile-z', 'line.widthMaxMm'],
    ]);
  });
});
