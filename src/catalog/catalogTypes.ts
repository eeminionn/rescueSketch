import { z } from 'zod';

import { localizedTextSchema, rulesetUnitSchema } from '../domain/ruleset';

const camelCaseIdentifierSchema = z.string().regex(/^[a-z][a-zA-Z0-9]*$/u);
const finiteNonNegativeSchema = z.number().finite().nonnegative();

export const catalogCategorySchema = z.enum([
  'line',
  'intersection',
  'hazard',
  'level',
  'marker',
  'evacuation',
  'victim',
]);

export const catalogKindSchema = z.enum(['tile', 'structure', 'marker', 'zone', 'victim']);

export const ruleReferenceSchema = z
  .object({
    ruleId: z.string().regex(/^[a-z][a-zA-Z0-9.]*$/u),
    sourceId: camelCaseIdentifierSchema,
    section: z.string().regex(/^3\.\d+(?:\.\d+)?$/u),
    page: z.number().int().min(13).max(18),
  })
  .strict();

const parameterBaseSchema = z.object({
  id: camelCaseIdentifierSchema,
  names: localizedTextSchema,
  descriptions: localizedTextSchema,
  defaultValue: z.number().finite(),
  unit: rulesetUnitSchema.exclude(['none']),
});

export const normativeParameterSchema = parameterBaseSchema
  .extend({
    parameterType: z.literal('normative'),
    ruleIds: z.array(z.string().regex(/^[a-z][a-zA-Z0-9.]*$/u)).min(1),
    minimum: z.number().finite().optional(),
    maximum: z.number().finite().optional(),
    maximumExclusive: z.number().finite().optional(),
  })
  .strict();

export const constructionParameterSchema = parameterBaseSchema
  .extend({
    parameterType: z.literal('constructionParameter'),
    step: z.number().finite().positive().optional(),
  })
  .strict();

export const catalogParametersSchema = z
  .object({
    normative: z.array(normativeParameterSchema),
    constructionParameter: z.array(constructionParameterSchema),
  })
  .strict();

const svgPaintSchema = z.enum([
  'none',
  'tile',
  'line',
  'greenMarker',
  'redMarker',
  'silverTape',
  'structure',
  'hazard',
  'livingVictim',
  'deadVictim',
  'checkpoint',
]);

const svgPrimitiveBaseSchema = z.object({
  fill: svgPaintSchema,
  stroke: svgPaintSchema,
  strokeWidthMm: finiteNonNegativeSchema,
});

export const svgPathPrimitiveSchema = svgPrimitiveBaseSchema
  .extend({
    type: z.literal('path'),
    d: z.string().min(1).max(1_000),
    lineCap: z.enum(['butt', 'round', 'square']).optional(),
    lineJoin: z.enum(['miter', 'round', 'bevel']).optional(),
  })
  .strict();

export const svgRectPrimitiveSchema = svgPrimitiveBaseSchema
  .extend({
    type: z.literal('rect'),
    x: z.number().finite(),
    y: z.number().finite(),
    width: finiteNonNegativeSchema,
    height: finiteNonNegativeSchema,
    radius: finiteNonNegativeSchema.optional(),
  })
  .strict();

export const svgCirclePrimitiveSchema = svgPrimitiveBaseSchema
  .extend({
    type: z.literal('circle'),
    centerX: z.number().finite(),
    centerY: z.number().finite(),
    radius: z.number().finite().positive(),
  })
  .strict();

export const svgPolygonPrimitiveSchema = svgPrimitiveBaseSchema
  .extend({
    type: z.literal('polygon'),
    points: z
      .array(
        z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
          })
          .strict(),
      )
      .min(3),
  })
  .strict();

export const svgDescriptorSchema = z
  .object({
    viewBox: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().finite().positive(),
        height: z.number().finite().positive(),
      })
      .strict(),
    primitives: z
      .array(
        z.discriminatedUnion('type', [
          svgPathPrimitiveSchema,
          svgRectPrimitiveSchema,
          svgCirclePrimitiveSchema,
          svgPolygonPrimitiveSchema,
        ]),
      )
      .min(1)
      .max(32),
  })
  .strict();

export const catalogItemSchema = z
  .object({
    id: camelCaseIdentifierSchema,
    category: catalogCategorySchema,
    kind: catalogKindSchema,
    names: localizedTextSchema,
    descriptions: localizedTextSchema,
    nominalDimensions: z.record(camelCaseIdentifierSchema, finiteNonNegativeSchema),
    parameters: catalogParametersSchema,
    ruleReferences: z.array(ruleReferenceSchema).min(1),
    advice: localizedTextSchema,
    svgDescriptor: svgDescriptorSchema,
  })
  .strict()
  .superRefine((item, context) => {
    const referencedRuleIds = new Set(item.ruleReferences.map(({ ruleId }) => ruleId));

    for (const [index, parameter] of item.parameters.normative.entries()) {
      for (const ruleId of parameter.ruleIds) {
        if (!referencedRuleIds.has(ruleId)) {
          context.addIssue({
            code: 'custom',
            message: `Normative parameter references undeclared rule: ${ruleId}`,
            path: ['parameters', 'normative', index, 'ruleIds'],
          });
        }
      }
    }
  });

export const catalogSchema = z
  .object({
    catalogVersion: z.string().min(1),
    rulesetVersion: z.string().min(1),
    sourceId: camelCaseIdentifierSchema,
    items: z.array(catalogItemSchema).min(1),
  })
  .strict()
  .superRefine((catalog, context) => {
    const ids = new Set<string>();

    for (const [index, item] of catalog.items.entries()) {
      if (ids.has(item.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate catalog item id: ${item.id}`,
          path: ['items', index, 'id'],
        });
      }

      ids.add(item.id);

      for (const [referenceIndex, reference] of item.ruleReferences.entries()) {
        if (reference.sourceId !== catalog.sourceId) {
          context.addIssue({
            code: 'custom',
            message: 'Catalog item sourceId must match the catalog sourceId.',
            path: ['items', index, 'ruleReferences', referenceIndex, 'sourceId'],
          });
        }
      }
    }
  });

export type CatalogCategory = z.infer<typeof catalogCategorySchema>;
export type CatalogKind = z.infer<typeof catalogKindSchema>;
export type RuleReference = z.infer<typeof ruleReferenceSchema>;
export type NormativeParameter = z.infer<typeof normativeParameterSchema>;
export type ConstructionParameter = z.infer<typeof constructionParameterSchema>;
export type SvgDescriptor = z.infer<typeof svgDescriptorSchema>;
export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
