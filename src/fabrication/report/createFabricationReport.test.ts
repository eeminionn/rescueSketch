import {
  createEmptyTrackDocument,
  getGeometryLength,
  type GeometrySegment,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../../domain';
import { createFabricationReport } from './createFabricationReport';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function tile(input: Pick<TrackTile, 'id' | 'catalogItemId'> & Partial<TrackTile>): TrackTile {
  return {
    id: input.id,
    catalogItemId: input.catalogItemId,
    levelId: input.levelId ?? 'level-0',
    position: input.position ?? { x: 0, y: 0 },
    rotation: input.rotation ?? 0,
    geometry: input.geometry ?? [],
    parameters: input.parameters ?? {},
  };
}

function structure(
  input: Pick<TrackStructure, 'id' | 'kind'> & Partial<TrackStructure>,
): TrackStructure {
  return {
    id: input.id,
    kind: input.kind,
    levelId: input.levelId ?? 'level-0',
    position: input.position ?? { x: 0, y: 0 },
    rotation: input.rotation ?? 0,
    geometry: input.geometry ?? [],
    parameters: input.parameters ?? {},
  };
}

function line(lengthMm: number): GeometrySegment {
  return {
    kind: 'line',
    start: { x: 0, y: 0 },
    end: { x: lengthMm, y: 0 },
  };
}

function createFabricationDocument(): TrackDocumentV1 {
  return {
    ...createEmptyTrackDocument(acceptedAt),
    levels: [
      {
        id: 'level-0',
        name: 'Ground',
        elevationMm: 0,
      },
      {
        id: 'level-1',
        name: 'Bridge',
        elevationMm: 250,
      },
    ],
    tiles: [
      tile({
        id: 'straight-b',
        catalogItemId: 'straightLine',
        position: { x: 300, y: 0 },
        rotation: 1,
        geometry: [line(300)],
        parameters: { lineWidthMm: 15 },
      }),
      tile({
        id: 'curve-a',
        catalogItemId: 'curveLine',
        geometry: [
          {
            kind: 'circularArc',
            center: { x: 150, y: 150 },
            radius: 150,
            startAngleDeg: 180,
            endAngleDeg: 270,
            clockwise: false,
          },
          {
            kind: 'circularArc',
            center: { x: 150, y: 150 },
            radius: 150,
            startAngleDeg: 270,
            endAngleDeg: 180,
            clockwise: true,
          },
        ],
        parameters: { lineWidthMm: 15, curveRadiusMm: 150 },
      }),
      tile({
        id: 'goal-c',
        catalogItemId: 'goalTile',
        geometry: [line(300)],
        parameters: { lineWidthMm: 15, tapeWidthMm: 25, tapeLengthMm: 300 },
      }),
      tile({
        id: 'entrance-d',
        catalogItemId: 'evacuationEntrance',
        geometry: [line(125)],
        parameters: { tapeWidthMm: 25, tapeLengthMm: 250 },
      }),
      tile({
        id: 'exit-e',
        catalogItemId: 'evacuationExit',
        geometry: [line(125)],
        parameters: { tapeWidthMm: 25, tapeLengthMm: 250 },
      }),
      tile({
        id: 'victim-f',
        catalogItemId: 'livingVictim',
        parameters: { diameterMm: 48, weightGram: 60 },
      }),
    ],
    structures: [
      structure({
        id: 'zone-g',
        kind: 'evacuationZone',
        position: { x: 600, y: 300 },
        rotation: 1,
        parameters: { widthMm: 1_200, heightMm: 900, wallHeightMm: 100 },
      }),
      structure({
        id: 'pillar-i',
        kind: 'pillar',
        levelId: 'level-1',
        parameters: { widthMm: 20, depthMm: 20, heightMm: 260 },
      }),
      structure({
        id: 'safe-h',
        kind: 'livingSafePoint',
        parameters: { legLengthMm: 300, wallWidthMm: 60 },
      }),
      structure({
        id: 'obstacle-j',
        kind: 'obstacle',
        position: { x: 100, y: 200 },
        rotation: 1,
        parameters: { footprintWidthMm: 100, footprintDepthMm: 150, heightMm: 150 },
      }),
      structure({
        id: 'seesaw-k',
        kind: 'seesaw',
        geometry: [line(300)],
        parameters: { lineWidthMm: 20 },
      }),
    ],
  };
}

describe('createFabricationReport', () => {
  it('returns a stable empty report using the default fabrication allowance', () => {
    const document = createEmptyTrackDocument(acceptedAt);

    expect(createFabricationReport(document)).toEqual({
      reportVersion: '1.0.0',
      source: {
        schemaVersion: '1.0.0',
        rulesetVersion: '2026.1',
        catalogVersion: '2026.1',
      },
      wasteRatio: 0.1,
      summary: {
        canvas: {
          widthMm: 2_400,
          heightMm: 1_800,
          areaSquareMm: 4_320_000,
          tileSizeMm: 300,
          gridSizeMm: 10,
          levelCount: 1,
        },
        elements: {
          total: 0,
          tileCount: 0,
          structureCount: 0,
          totalLineLengthMm: 0,
          uniqueRadiiMm: [],
        },
      },
      measurements: [],
      tapeRequirements: [],
      inventory: {
        items: [],
        materials: [],
      },
    });
  });

  it('measures geometry, rotated footprints, and unique radii in millimetres', () => {
    const document = createFabricationDocument();
    const report = createFabricationReport(document);
    const curve = report.measurements.find(({ elementId }) => elementId === 'curve-a');
    const zone = report.measurements.find(({ elementId }) => elementId === 'zone-g');
    const obstacle = report.measurements.find(({ elementId }) => elementId === 'obstacle-j');
    const victim = report.measurements.find(({ elementId }) => elementId === 'victim-f');

    expect(report.summary.canvas.levelCount).toBe(2);
    expect(report.summary.elements).toMatchObject({
      total: 11,
      tileCount: 6,
      structureCount: 5,
      uniqueRadiiMm: [150],
    });
    expect(curve).toMatchObject({
      catalogItemId: 'curveLine',
      lineLengthMm: getGeometryLength(document.tiles[1]!.geometry),
      radiiMm: [150],
    });
    expect(zone?.footprint).toEqual({
      baseWidthMm: 1_200,
      baseDepthMm: 900,
      widthMm: 900,
      depthMm: 1_200,
      minXmm: 750,
      minYmm: 150,
      maxXmm: 1_650,
      maxYmm: 1_350,
    });
    expect(obstacle?.footprint).toEqual({
      baseWidthMm: 100,
      baseDepthMm: 150,
      widthMm: 150,
      depthMm: 100,
      minXmm: 175,
      minYmm: 300,
      maxXmm: 325,
      maxYmm: 400,
    });
    expect(victim?.footprint).toMatchObject({
      baseWidthMm: 48,
      baseDepthMm: 48,
      widthMm: 48,
      depthMm: 48,
      minXmm: 1,
      minYmm: 1,
      maxXmm: 49,
      maxYmm: 49,
    });
    expect(report.measurements.map(({ elementId }) => elementId)).toEqual(
      [...report.measurements.map(({ elementId }) => elementId)].sort(),
    );
  });

  it('groups ordinary and special-purpose tape by colour and effective width', () => {
    const report = createFabricationReport(createFabricationDocument());
    const black15 = report.tapeRequirements.find(
      ({ color, widthMm }) => color === 'black' && widthMm === 15,
    );
    const black20 = report.tapeRequirements.find(
      ({ color, widthMm }) => color === 'black' && widthMm === 20,
    );

    expect(black15).toMatchObject({
      netLengthMm: 1_321.238898038,
      purchaseLengthMm: 1_453.362787842,
      wasteRatio: 0.1,
      sourceElementIds: ['curve-a', 'entrance-d', 'exit-e', 'goal-c', 'straight-b'],
    });
    expect(black20).toMatchObject({
      netLengthMm: 300,
      purchaseLengthMm: 330,
      sourceElementIds: ['seesaw-k'],
    });
    expect(report.tapeRequirements).toContainEqual({
      color: 'black',
      widthMm: 25,
      netLengthMm: 250,
      purchaseLengthMm: 275,
      wasteRatio: 0.1,
      sourceElementIds: ['exit-e'],
    });
    expect(report.tapeRequirements).toContainEqual({
      color: 'red',
      widthMm: 25,
      netLengthMm: 300,
      purchaseLengthMm: 330,
      wasteRatio: 0.1,
      sourceElementIds: ['goal-c'],
    });
    expect(report.tapeRequirements).toContainEqual({
      color: 'silver',
      widthMm: 25,
      netLengthMm: 250,
      purchaseLengthMm: 275,
      wasteRatio: 0.1,
      sourceElementIds: ['entrance-d'],
    });
  });

  it('groups piece, structure, victim, hazard, and construction inventories', () => {
    const report = createFabricationReport(createFabricationDocument(), { wasteRatio: 0 });

    expect(
      report.inventory.items.map(({ group, catalogItemId, quantity }) => ({
        group,
        catalogItemId,
        quantity,
      })),
    ).toEqual([
      { group: 'hazard', catalogItemId: 'obstacle', quantity: 1 },
      { group: 'piece', catalogItemId: 'curveLine', quantity: 1 },
      { group: 'piece', catalogItemId: 'evacuationEntrance', quantity: 1 },
      { group: 'piece', catalogItemId: 'evacuationExit', quantity: 1 },
      { group: 'piece', catalogItemId: 'goalTile', quantity: 1 },
      { group: 'piece', catalogItemId: 'straightLine', quantity: 1 },
      { group: 'structure', catalogItemId: 'evacuationZone', quantity: 1 },
      { group: 'structure', catalogItemId: 'livingSafePoint', quantity: 1 },
      { group: 'structure', catalogItemId: 'pillar', quantity: 1 },
      { group: 'structure', catalogItemId: 'seesaw', quantity: 1 },
      { group: 'victim', catalogItemId: 'livingVictim', quantity: 1 },
    ]);
    expect(report.inventory.materials).toEqual([
      {
        materialId: 'bridgePillar',
        unit: 'piece',
        quantity: 1,
        netLengthMm: 260,
        specification: { depthMm: 20, heightMm: 260, widthMm: 20 },
        sourceElementIds: ['pillar-i'],
      },
      {
        materialId: 'evacuationWall',
        unit: 'linearMm',
        quantity: 1,
        netLengthMm: 4_200,
        specification: { depthMm: 900, wallHeightMm: 100, widthMm: 1_200 },
        sourceElementIds: ['zone-g'],
      },
      {
        materialId: 'livingSafePointWall',
        unit: 'linearMm',
        quantity: 1,
        netLengthMm: 1_024.264068712,
        specification: { legLengthMm: 300, wallWidthMm: 60 },
        sourceElementIds: ['safe-h'],
      },
    ]);
  });

  it('adds the four corner pillars required by each bridge tile to the cut list', () => {
    const document = {
      ...createEmptyTrackDocument(acceptedAt),
      structures: [
        structure({
          id: 'bridge-1',
          kind: 'bridge',
          parameters: {
            pillarWidthMm: 22,
            clearanceHeightMm: 275,
          },
        }),
      ],
    };

    expect(createFabricationReport(document).inventory.materials).toEqual([
      {
        materialId: 'bridgePillar',
        unit: 'piece',
        quantity: 4,
        netLengthMm: 1_100,
        specification: { depthMm: 22, heightMm: 275, widthMm: 22 },
        sourceElementIds: ['bridge-1'],
      },
    ]);
  });

  it('uses an injected geometry resolver without persisting derived measurements', () => {
    const document = createEmptyTrackDocument(acceptedAt);
    const source = {
      ...document,
      tiles: [
        tile({
          id: 'curve-resolved',
          catalogItemId: 'curveLine',
          geometry: [],
          parameters: { lineWidthMm: 10 },
        }),
      ],
    };
    const before = structuredClone(source);
    const resolvedGeometry: GeometrySegment[] = [
      {
        kind: 'circularArc',
        center: { x: 0, y: 0 },
        radius: 100,
        startAngleDeg: 0,
        endAngleDeg: 90,
        clockwise: false,
      },
    ];
    const resolveGeometry = vi.fn(() => resolvedGeometry);
    const report = createFabricationReport(source, { resolveGeometry });

    expect(resolveGeometry).toHaveBeenCalledOnce();
    expect(resolveGeometry).toHaveBeenCalledWith(source.tiles[0], source);
    expect(report.measurements[0]).toMatchObject({
      lineLengthMm: getGeometryLength(resolvedGeometry),
      radiiMm: [100],
    });
    expect(source).toEqual(before);
    expect(source.tiles[0]?.geometry).toEqual([]);
  });

  it('counts resolved black route through every line-bearing structure', () => {
    const document = {
      ...createEmptyTrackDocument(acceptedAt),
      structures: (['speedBump', 'debris', 'obstacle', 'ramp', 'bridge', 'seesaw'] as const).map(
        (kind) =>
          structure({
            id: `${kind}-route`,
            kind,
            geometry: [],
            parameters: kind === 'seesaw' ? { lineWidthMm: 20 } : {},
          }),
      ),
    };
    const report = createFabricationReport(document, {
      resolveGeometry: () => [line(100)],
      wasteRatio: 0,
    });

    expect(report.tapeRequirements).toEqual([
      {
        color: 'black',
        widthMm: 15,
        netLengthMm: 500,
        purchaseLengthMm: 500,
        wasteRatio: 0,
        sourceElementIds: [
          'bridge-route',
          'debris-route',
          'obstacle-route',
          'ramp-route',
          'speedBump-route',
        ],
      },
      {
        color: 'black',
        widthMm: 20,
        netLengthMm: 100,
        purchaseLengthMm: 100,
        wasteRatio: 0,
        sourceElementIds: ['seesaw-route'],
      },
    ]);
  });

  it('is invariant to source collection order and rounds every derived measurement', () => {
    const document = createFabricationDocument();
    const reordered = {
      ...document,
      tiles: [...document.tiles].reverse(),
      structures: [...document.structures].reverse(),
    };

    expect(createFabricationReport(reordered, { wasteRatio: 0.137 })).toEqual(
      createFabricationReport(document, { wasteRatio: 0.137 }),
    );
    expect(JSON.stringify(createFabricationReport(document)).includes('0.000000000000000')).toBe(
      false,
    );
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid wasteRatio %s',
    (wasteRatio) => {
      expect(() =>
        createFabricationReport(createEmptyTrackDocument(acceptedAt), { wasteRatio }),
      ).toThrow(RangeError);
    },
  );

  it.each([0, 1])('accepts wasteRatio boundary %s', (wasteRatio) => {
    expect(
      createFabricationReport(createEmptyTrackDocument(acceptedAt), { wasteRatio }).wasteRatio,
    ).toBe(wasteRatio);
  });
});
