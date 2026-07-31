import { getRescueLine2026Rule } from '../rules';
import {
  catalogSchema,
  getCatalogItem,
  getCatalogItemsByCategory,
  rescueSketchCatalog,
  rescueSketchCatalogIds,
} from './index';

const requiredCatalogIds = [
  'straightLine',
  'curveLine',
  'gapLine',
  'diagonalLine',
  'wavyLine',
  'threeWayIntersection',
  'fourWayIntersection',
  'plainFourWayIntersection',
  'startTile',
  'deadEndIntersection',
  'goalTile',
  'speedBump',
  'debris',
  'obstacle',
  'ramp',
  'bridge',
  'pillar',
  'seesaw',
  'checkpoint',
  'evacuationZone',
  'evacuationEntrance',
  'evacuationExit',
  'livingSafePoint',
  'deadSafePoint',
  'livingVictim',
  'deadVictim',
] as const;

describe('RescueSketch catalog', () => {
  it('publishes every required piece under a unique camelCase identifier', () => {
    expect(catalogSchema.safeParse(rescueSketchCatalog).success).toBe(true);
    expect(rescueSketchCatalogIds).toEqual(requiredCatalogIds);
    expect(new Set(rescueSketchCatalogIds)).toHaveProperty('size', rescueSketchCatalogIds.length);

    for (const catalogItemId of rescueSketchCatalogIds) {
      expect(catalogItemId).toMatch(/^[a-z][a-zA-Z0-9]*$/u);
    }
  });

  it('keeps every normative parameter traceable to the verified ruleset', () => {
    for (const catalogItem of rescueSketchCatalog.items) {
      expect(catalogItem.names.es.length).toBeGreaterThan(0);
      expect(catalogItem.names.en.length).toBeGreaterThan(0);
      expect(catalogItem.descriptions.es.length).toBeGreaterThan(0);
      expect(catalogItem.descriptions.en.length).toBeGreaterThan(0);
      expect(catalogItem.advice.es.length).toBeGreaterThan(0);
      expect(catalogItem.advice.en.length).toBeGreaterThan(0);
      expect(catalogItem.ruleReferences.length).toBeGreaterThan(0);

      const referencesByRuleId = new Map(
        catalogItem.ruleReferences.map((reference) => [reference.ruleId, reference] as const),
      );

      for (const reference of catalogItem.ruleReferences) {
        const rule = getRescueLine2026Rule(reference.ruleId);
        expect(reference).toMatchObject({
          sourceId: rescueSketchCatalog.sourceId,
          section: rule.section,
          page: rule.page,
        });
      }

      for (const parameter of catalogItem.parameters.normative) {
        expect(parameter.parameterType).toBe('normative');

        for (const ruleId of parameter.ruleIds) {
          expect(referencesByRuleId.has(ruleId)).toBe(true);
          expect(() => getRescueLine2026Rule(ruleId)).not.toThrow();
        }
      }

      for (const parameter of catalogItem.parameters.constructionParameter) {
        expect(parameter.parameterType).toBe('constructionParameter');
        expect(parameter).not.toHaveProperty('ruleIds');
      }
    }
  });

  it('covers every product category and expected geometry family', () => {
    expect(new Set(rescueSketchCatalog.items.map(({ category }) => category))).toEqual(
      new Set(['line', 'intersection', 'hazard', 'level', 'marker', 'evacuation', 'victim']),
    );

    expect(getCatalogItemsByCategory('line').map(({ id }) => id)).toEqual([
      'straightLine',
      'curveLine',
      'gapLine',
      'diagonalLine',
      'wavyLine',
      'goalTile',
    ]);
    expect(getCatalogItemsByCategory('intersection')).toHaveLength(5);
    expect(getCatalogItemsByCategory('hazard')).toHaveLength(3);
    expect(getCatalogItemsByCategory('level')).toHaveLength(4);
    expect(getCatalogItemsByCategory('evacuation')).toHaveLength(5);
    expect(getCatalogItemsByCategory('victim')).toHaveLength(2);
  });

  it('provides safe, self-contained original SVG descriptors for every piece', () => {
    for (const catalogItem of rescueSketchCatalog.items) {
      const { svgDescriptor } = catalogItem;
      expect(svgDescriptor.viewBox.width).toBeGreaterThan(0);
      expect(svgDescriptor.viewBox.height).toBeGreaterThan(0);
      expect(svgDescriptor.primitives.length).toBeGreaterThan(0);
      expect(JSON.stringify(svgDescriptor)).not.toMatch(/<script|foreignObject|https?:|data:/iu);
    }

    for (const catalogItemId of [
      'straightLine',
      'curveLine',
      'gapLine',
      'diagonalLine',
      'wavyLine',
      'threeWayIntersection',
      'fourWayIntersection',
      'plainFourWayIntersection',
      'startTile',
      'deadEndIntersection',
      'goalTile',
    ]) {
      expect(
        getCatalogItem(catalogItemId).svgDescriptor.primitives.some(({ type }) => type === 'path'),
      ).toBe(true);
    }

    expect(getCatalogItem('evacuationZone').svgDescriptor.viewBox).toMatchObject({
      width: 1_200,
      height: 900,
    });
    expect(getCatalogItem('livingSafePoint').svgDescriptor.primitives[0]?.type).toBe('polygon');
    expect(getCatalogItem('livingVictim').svgDescriptor.primitives[0]?.type).toBe('circle');
  });

  it('treats every radius as a fabrication choice rather than a RoboCup rule', () => {
    const radiusParameters = rescueSketchCatalog.items.flatMap((catalogItem) => [
      ...catalogItem.parameters.normative.filter(({ id }) => id.toLowerCase().includes('radius')),
      ...catalogItem.parameters.constructionParameter.filter(({ id }) =>
        id.toLowerCase().includes('radius'),
      ),
    ]);

    expect(radiusParameters.length).toBeGreaterThan(0);
    expect(
      radiusParameters.every(({ parameterType }) => parameterType === 'constructionParameter'),
    ).toBe(true);
    expect(
      getCatalogItem('curveLine').parameters.constructionParameter.find(
        ({ id }) => id === 'curveRadiusMm',
      ),
    ).toMatchObject({
      defaultValue: 150,
      unit: 'mm',
      parameterType: 'constructionParameter',
    });
  });

  it('fails closed for unknown catalog identifiers', () => {
    expect(() => getCatalogItem('inventedOfficialCurve')).toThrow(RangeError);
  });
});
