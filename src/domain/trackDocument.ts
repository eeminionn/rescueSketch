import { z } from 'zod';

import { geometrySegmentSchema, pointSchema } from './geometry';

export const schemaVersion = '1.0.0' as const;
export const defaultRulesetVersion = '2026.1' as const;
export const tileSizeMm = 300 as const;

const identifierSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/u);
const quarterTurnsSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const trackCanvasSchema = z
  .object({
    widthMm: z.number().finite().positive().max(30_000),
    heightMm: z.number().finite().positive().max(30_000),
    tileSizeMm: z.literal(tileSizeMm),
    gridSizeMm: z.number().finite().positive().max(tileSizeMm),
  })
  .strict();

export const trackLevelSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1).max(120),
    elevationMm: z.number().finite().min(0).max(10_000),
  })
  .strict();

export const trackTileSchema = z
  .object({
    id: identifierSchema,
    catalogItemId: identifierSchema,
    levelId: identifierSchema,
    position: pointSchema,
    rotation: quarterTurnsSchema,
    geometry: z.array(geometrySegmentSchema).max(64),
    parameters: z.record(z.string(), z.union([z.number().finite(), z.string(), z.boolean()])),
  })
  .strict();

export const trackStructureSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum([
      'bridge',
      'pillar',
      'ramp',
      'seesaw',
      'evacuationZone',
      'obstacle',
      'speedBump',
      'debris',
    ]),
    levelId: identifierSchema,
    position: pointSchema,
    rotation: quarterTurnsSchema,
    geometry: z.array(geometrySegmentSchema).max(128),
    parameters: z.record(z.string(), z.union([z.number().finite(), z.string(), z.boolean()])),
  })
  .strict();

export const trackAnnotationSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum(['dimension', 'radius', 'note', 'construction']),
    position: pointSchema,
    text: z
      .object({
        es: z.string().max(500).optional(),
        en: z.string().max(500).optional(),
      })
      .strict(),
    elementId: identifierSchema.optional(),
  })
  .strict();

export const trackLicenseSchema = z
  .object({
    spdxIdentifier: z.literal('CC-BY-4.0'),
    acceptedAt: z.iso.datetime({ offset: true }),
    attributionName: z.string().min(1).max(120).optional(),
  })
  .strict();

export const trackDocumentV1Schema = z
  .object({
    schemaVersion: z.literal(schemaVersion),
    rulesetVersion: z.string().min(1).max(40),
    catalogVersion: z.string().min(1).max(40),
    canvas: trackCanvasSchema,
    levels: z.array(trackLevelSchema).min(1).max(20),
    tiles: z.array(trackTileSchema).max(500),
    structures: z.array(trackStructureSchema).max(500),
    annotations: z.array(trackAnnotationSchema).max(2_000),
    license: trackLicenseSchema,
  })
  .strict()
  .superRefine((document, context) => {
    const levelIds = new Set(document.levels.map(({ id }) => id));
    const elementIds = new Set<string>();

    for (const [collectionName, elements] of [
      ['tiles', document.tiles],
      ['structures', document.structures],
    ] as const) {
      for (const [index, element] of elements.entries()) {
        if (!levelIds.has(element.levelId)) {
          context.addIssue({
            code: 'custom',
            message: `Unknown levelId: ${element.levelId}`,
            path: [collectionName, index, 'levelId'],
          });
        }

        if (elementIds.has(element.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate element id: ${element.id}`,
            path: [collectionName, index, 'id'],
          });
        }

        elementIds.add(element.id);
      }
    }
  });

export const trackDocumentV1JsonSchema = z.toJSONSchema(trackDocumentV1Schema, {
  target: 'draft-2020-12',
});

export type TrackDocumentV1 = z.infer<typeof trackDocumentV1Schema>;
export type TrackCanvas = z.infer<typeof trackCanvasSchema>;
export type TrackLevel = z.infer<typeof trackLevelSchema>;
export type TrackTile = z.infer<typeof trackTileSchema>;
export type TrackStructure = z.infer<typeof trackStructureSchema>;
export type TrackAnnotation = z.infer<typeof trackAnnotationSchema>;

export function parseTrackDocument(document: unknown): TrackDocumentV1 {
  return trackDocumentV1Schema.parse(document);
}

function sortCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortCanonicalValue);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortCanonicalValue(child)]),
    );
  }

  return value;
}

export function serializeTrackDocument(document: TrackDocumentV1): string {
  const parsedDocument = parseTrackDocument(document);
  return `${JSON.stringify(sortCanonicalValue(parsedDocument), null, 2)}\n`;
}

export function createEmptyTrackDocument(
  acceptedAt: string,
  catalogVersion = '2026.1',
): TrackDocumentV1 {
  return parseTrackDocument({
    schemaVersion,
    rulesetVersion: defaultRulesetVersion,
    catalogVersion,
    canvas: {
      widthMm: tileSizeMm * 8,
      heightMm: tileSizeMm * 6,
      tileSizeMm,
      gridSizeMm: 10,
    },
    levels: [
      {
        id: 'level-0',
        name: 'Ground',
        elevationMm: 0,
      },
    ],
    tiles: [],
    structures: [],
    annotations: [],
    license: {
      spdxIdentifier: 'CC-BY-4.0',
      acceptedAt,
    },
  });
}
