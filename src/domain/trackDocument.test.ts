import {
  createEmptyTrackDocument,
  parseTrackDocument,
  serializeTrackDocument,
  trackDocumentV1JsonSchema,
  trackDocumentV1Schema,
} from './trackDocument';

const acceptedAt = '2026-07-30T18:00:00-04:00';

describe('TrackDocumentV1', () => {
  it('creates the required 8 × 6 tile canvas in millimetres', () => {
    const document = createEmptyTrackDocument(acceptedAt);

    expect(document.canvas).toEqual({
      widthMm: 2_400,
      heightMm: 1_800,
      tileSizeMm: 300,
      gridSizeMm: 10,
    });
    expect(document.schemaVersion).toBe('1.0.0');
    expect(document.rulesetVersion).toBe('2026.1');
    expect(trackDocumentV1JsonSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('round-trips through a deterministic canonical representation', () => {
    const document = createEmptyTrackDocument(acceptedAt);
    const firstSerialization = serializeTrackDocument(document);
    const roundTripped = parseTrackDocument(JSON.parse(firstSerialization));

    expect(serializeTrackDocument(roundTripped)).toBe(firstSerialization);
    expect(firstSerialization.endsWith('\n')).toBe(true);
    expect(firstSerialization.indexOf('"annotations"')).toBeLessThan(
      firstSerialization.indexOf('"canvas"'),
    );
  });

  it('does not permit derived segment lengths in canonical JSON', () => {
    const document = createEmptyTrackDocument(acceptedAt) as unknown as Record<string, unknown>;
    document.tiles = [
      {
        id: 'tile-1',
        catalogItemId: 'straight',
        levelId: 'level-0',
        position: { x: 0, y: 0 },
        rotation: 0,
        geometry: [
          {
            kind: 'line',
            start: { x: 0, y: 150 },
            end: { x: 300, y: 150 },
            lengthMm: 300,
          },
        ],
        parameters: {},
      },
    ];

    expect(trackDocumentV1Schema.safeParse(document).success).toBe(false);
  });

  it('rejects elements that reference an unknown level', () => {
    const document = createEmptyTrackDocument(acceptedAt);
    const invalidDocument = {
      ...document,
      tiles: [
        {
          id: 'tile-1',
          catalogItemId: 'straight',
          levelId: 'missing-level',
          position: { x: 0, y: 0 },
          rotation: 0,
          geometry: [],
          parameters: {},
        },
      ],
    };

    expect(trackDocumentV1Schema.safeParse(invalidDocument).success).toBe(false);
  });

  it('migrates v0.2 safe-point tiles into structures before validation', () => {
    const document = createEmptyTrackDocument(acceptedAt);
    const legacyDocument = {
      ...document,
      tiles: [
        {
          id: 'safe-point-1',
          catalogItemId: 'livingSafePoint',
          levelId: 'level-0',
          position: { x: 300, y: 600 },
          rotation: 1,
          geometry: [],
          parameters: {
            legLengthMm: 300,
            wallWidthMm: 60,
          },
        },
      ],
    };
    const migratedDocument = parseTrackDocument(legacyDocument);

    expect(migratedDocument.tiles).toEqual([]);
    expect(migratedDocument.structures).toEqual([
      {
        id: 'safe-point-1',
        kind: 'livingSafePoint',
        levelId: 'level-0',
        position: { x: 300, y: 600 },
        rotation: 1,
        geometry: [],
        parameters: {
          legLengthMm: 300,
          wallWidthMm: 60,
        },
      },
    ]);
    expect(parseTrackDocument(migratedDocument)).toEqual(migratedDocument);
  });
});
