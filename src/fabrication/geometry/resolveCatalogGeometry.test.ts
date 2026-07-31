import fc from 'fast-check';

import { rescueSketchCatalog, rescueSketchCatalogIds } from '../../catalog';
import {
  geometrySegmentSchema,
  getGeometryLength,
  rotateSegment,
  type QuarterTurns,
} from '../../domain';
import { resolveCatalogGeometry } from './resolveCatalogGeometry';

const routedCatalogItemIds = new Set([
  'bridge',
  'curveLine',
  'deadEndIntersection',
  'debris',
  'diagonalLine',
  'evacuationEntrance',
  'evacuationExit',
  'fourWayIntersection',
  'gapLine',
  'goalTile',
  'obstacle',
  'plainFourWayIntersection',
  'ramp',
  'seesaw',
  'speedBump',
  'startTile',
  'straightLine',
  'threeWayIntersection',
  'wavyLine',
]);

const unroutedCatalogItemIds = new Set([
  'checkpoint',
  'deadSafePoint',
  'deadVictim',
  'evacuationZone',
  'livingSafePoint',
  'livingVictim',
  'pillar',
]);

describe('resolveCatalogGeometry', () => {
  it('declares deterministic route behaviour for every catalog item', () => {
    expect(new Set([...routedCatalogItemIds, ...unroutedCatalogItemIds])).toEqual(
      new Set(rescueSketchCatalogIds),
    );

    for (const catalogItemId of rescueSketchCatalogIds) {
      const first = resolveCatalogGeometry(catalogItemId);
      const second = resolveCatalogGeometry(catalogItemId);

      expect(second).toEqual(first);
      expect(first.length > 0).toBe(routedCatalogItemIds.has(catalogItemId));

      for (const segment of first) {
        expect(geometrySegmentSchema.safeParse(segment).success).toBe(true);
      }
    }
  });

  it('uses finite numeric overrides and otherwise falls back to catalog defaults', () => {
    expect(
      resolveCatalogGeometry('straightLine', {
        lineOffsetMm: 125,
      }),
    ).toEqual([
      {
        kind: 'line',
        start: { x: 0, y: 125 },
        end: { x: 300, y: 125 },
      },
    ]);

    expect(
      resolveCatalogGeometry('straightLine', {
        lineOffsetMm: '125',
      }),
    ).toEqual(resolveCatalogGeometry('straightLine'));
    expect(
      resolveCatalogGeometry('straightLine', {
        lineOffsetMm: Number.NaN,
      }),
    ).toEqual(resolveCatalogGeometry('straightLine'));
  });

  it('resolves exact quarter arcs without persisting a derived length', () => {
    expect(resolveCatalogGeometry('curveLine', { curveRadiusMm: 120 })).toEqual([
      {
        kind: 'circularArc',
        center: { x: 0, y: 300 },
        radius: 120,
        startAngleDeg: 270,
        endAngleDeg: 0,
        clockwise: false,
      },
    ]);
    expect(getGeometryLength(resolveCatalogGeometry('curveLine'))).toBeCloseTo(
      (Math.PI * 150) / 2,
      8,
    );
  });

  it('models gaps, intersections and terminal markers from effective dimensions', () => {
    expect(
      resolveCatalogGeometry('gapLine', {
        gapCenterMm: 120,
        gapLengthMm: 80,
      }),
    ).toEqual([
      {
        kind: 'line',
        start: { x: 0, y: 150 },
        end: { x: 80, y: 150 },
      },
      {
        kind: 'line',
        start: { x: 160, y: 150 },
        end: { x: 300, y: 150 },
      },
    ]);
    expect(resolveCatalogGeometry('threeWayIntersection')).toHaveLength(3);
    expect(resolveCatalogGeometry('fourWayIntersection')).toHaveLength(4);
    expect(resolveCatalogGeometry('plainFourWayIntersection')).toHaveLength(4);
    expect(resolveCatalogGeometry('startTile')).toHaveLength(3);
    expect(resolveCatalogGeometry('deadEndIntersection')).toHaveLength(3);
    expect(getGeometryLength(resolveCatalogGeometry('goalTile'))).toBe(137.5);
    expect(getGeometryLength(resolveCatalogGeometry('evacuationEntrance'))).toBe(137.5);
    expect(getGeometryLength(resolveCatalogGeometry('evacuationExit'))).toBe(137.5);
  });

  it('uses physical hazard footprints without deriving or storing their lengths', () => {
    expect(
      getGeometryLength(
        resolveCatalogGeometry('speedBump', {
          widthMm: 240,
          depthMm: 120,
          cornerRadiusMm: 20,
        }),
      ),
    ).toBe(300);
    expect(
      getGeometryLength(
        resolveCatalogGeometry('obstacle', {
          footprintWidthMm: 120,
          footprintDepthMm: 100,
        }),
      ),
    ).toBe(180);

    for (const catalogItemId of ['debris', 'bridge', 'seesaw']) {
      expect(getGeometryLength(resolveCatalogGeometry(catalogItemId))).toBe(300);
    }
    expect(getGeometryLength(resolveCatalogGeometry('ramp'))).toBeCloseTo(Math.SQRT2 * 300, 8);
  });

  it.each([
    ['curveLine', { curveRadiusMm: 0 }],
    ['curveLine', { curveRadiusMm: 0.0000000001 }],
    ['curveLine', { curveRadiusMm: 301 }],
    ['gapLine', { gapLengthMm: 301 }],
    ['gapLine', { gapCenterMm: 20, gapLengthMm: 100 }],
    ['diagonalLine', { edgeInsetMm: 300 }],
    ['wavyLine', { amplitudeMm: 151 }],
    ['wavyLine', { waveLengthMm: 0 }],
    ['goalTile', { tapeLengthMm: 301 }],
    ['speedBump', { widthMm: 301 }],
    ['speedBump', { widthMm: 100, depthMm: 100, cornerRadiusMm: 51 }],
    ['obstacle', { footprintWidthMm: 301 }],
    ['evacuationEntrance', { tapeCenterMm: 5 }],
    ['evacuationExit', { tapeLengthMm: 301 }],
  ] as const)('rejects impossible local geometry for %s', (catalogItemId, parameters) => {
    expect(() => resolveCatalogGeometry(catalogItemId, parameters)).toThrow(RangeError);
  });

  it('approximates waves deterministically within the document segment limit', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 150, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 1_200, noNaN: true, noDefaultInfinity: true }),
        (amplitudeMm, waveLengthMm) => {
          const segments = resolveCatalogGeometry('wavyLine', {
            amplitudeMm,
            waveLengthMm,
          });

          expect(segments.length).toBeGreaterThanOrEqual(8);
          expect(segments.length).toBeLessThanOrEqual(64);
          const first = segments[0];
          const last = segments.at(-1);

          if (first?.kind !== 'line' || last?.kind !== 'line') {
            throw new Error('Wave fixture must begin and end with line segments.');
          }

          expect(first.start).toEqual({ x: 0, y: 150 });
          expect(last.end.x).toBe(300);
          expect(getGeometryLength(segments)).toBeGreaterThanOrEqual(300);

          for (let index = 1; index < segments.length; index += 1) {
            const previous = segments[index - 1];
            const current = segments[index];

            if (
              previous === undefined ||
              previous.kind !== 'line' ||
              current === undefined ||
              current.kind !== 'line'
            ) {
              throw new Error('Wave fixture must contain consecutive line segments.');
            }

            expect(current.start).toEqual(previous.end);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('keeps resolved gap length equal to the tile width minus the requested gap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 300 }).chain((gapLengthMm) =>
          fc.integer({ min: 0, max: 300 - gapLengthMm }).map((gapStartMm) => ({
            gapCenterMm: gapStartMm + gapLengthMm / 2,
            gapLengthMm,
          })),
        ),
        ({ gapCenterMm, gapLengthMm }) => {
          const geometry = resolveCatalogGeometry('gapLine', {
            gapCenterMm,
            gapLengthMm,
          });

          expect(getGeometryLength(geometry)).toBeCloseTo(300 - gapLengthMm, 8);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('preserves exact circular-arc length for every valid fabrication radius', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 300, noNaN: true, noDefaultInfinity: true }),
        (curveRadiusMm) => {
          const geometry = resolveCatalogGeometry('curveLine', { curveRadiusMm });

          expect(geometry).toHaveLength(1);
          expect(geometry[0]?.kind).toBe('circularArc');
          expect(getGeometryLength(geometry)).toBeCloseTo((Math.PI * curveRadiusMm) / 2, 7);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('keeps every routed catalog length invariant under quarter-turn rotation', () => {
    fc.assert(
      fc.property(fc.constantFrom<QuarterTurns>(0, 1, 2, 3), (quarterTurns) => {
        for (const catalogItemId of routedCatalogItemIds) {
          const catalogItem = rescueSketchCatalog.items.find(({ id }) => id === catalogItemId);

          if (catalogItem === undefined) {
            throw new Error(`Missing catalog fixture: ${catalogItemId}`);
          }

          const geometry = resolveCatalogGeometry(catalogItemId);
          const { width, height } = catalogItem.svgDescriptor.viewBox;
          const rotated = geometry.map((segment) =>
            rotateSegment(segment, quarterTurns, {
              x: width / 2,
              y: height / 2,
            }),
          );

          expect(getGeometryLength(rotated)).toBeCloseTo(getGeometryLength(geometry), 7);
        }
      }),
      { numRuns: 40 },
    );
  });
});
