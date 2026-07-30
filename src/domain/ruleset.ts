import { z } from 'zod';

export const rulesetUnitSchema = z.enum(['mm', 'degree', 'gram', 'count', 'ratio', 'none']);

export const ruleTypeSchema = z.enum(['normative', 'constructionParameter', 'advice']);

export const validationModeSchema = z.enum(['automated', 'manual', 'informational']);

export const rulesetSourceSchema = z
  .object({
    title: z.string().min(1),
    revision: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    language: z.literal('en'),
    url: z.string().url(),
  })
  .strict();

export const localizedTextSchema = z
  .object({
    es: z.string().min(1),
    en: z.string().min(1),
  })
  .strict();

export const rulesetPrimitiveSchema = z.union([z.number().finite(), z.string(), z.boolean()]);

export const rulesetValueSchema = z
  .object({
    value: rulesetPrimitiveSchema,
    unit: rulesetUnitSchema,
    ruleType: ruleTypeSchema,
    section: z.string().regex(/^3\.\d+(?:\.\d+)?$/u),
    page: z.number().int().min(13).max(18),
    source: rulesetSourceSchema,
    tolerance: z.number().min(0).max(1).nullable(),
    validationMode: validationModeSchema,
  })
  .strict();

export const rulesetEntrySchema = rulesetValueSchema
  .extend({
    id: z.string().regex(/^[a-z][a-zA-Z0-9.]*$/u),
    title: localizedTextSchema,
    description: localizedTextSchema,
  })
  .strict();

export const rulesetBaseSchema = z
  .object({
    rulesetVersion: z.string().min(1),
    publishedAt: z.iso.date(),
    officialLanguage: z.literal('en'),
    informativeLanguages: z.array(z.literal('es')),
    source: rulesetSourceSchema,
    disclaimer: localizedTextSchema,
    entries: z.array(rulesetEntrySchema).min(1),
  })
  .strict();

export const rulesetSchema = rulesetBaseSchema.superRefine((ruleset, context) => {
  const entryIds = new Set<string>();

  for (const [index, entry] of ruleset.entries.entries()) {
    if (entryIds.has(entry.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate ruleset entry id: ${entry.id}`,
        path: ['entries', index, 'id'],
      });
    }

    entryIds.add(entry.id);

    if (entry.source.sha256 !== ruleset.source.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Entry source must match the ruleset source.',
        path: ['entries', index, 'source'],
      });
    }

    if (entry.unit === 'count' && entry.tolerance !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Exact counts cannot inherit the dimensional tolerance.',
        path: ['entries', index, 'tolerance'],
      });
    }
  }
});

export type RulesetUnit = z.infer<typeof rulesetUnitSchema>;
export type RuleType = z.infer<typeof ruleTypeSchema>;
export type ValidationMode = z.infer<typeof validationModeSchema>;
export type RulesetSource = z.infer<typeof rulesetSourceSchema>;
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export interface RulesetValue<T> {
  value: T;
  unit: RulesetUnit;
  ruleType: RuleType;
  section: string;
  page: number;
  source: RulesetSource;
  tolerance: number | null;
  validationMode: ValidationMode;
}

export type RulesetEntry = z.infer<typeof rulesetEntrySchema>;
export type Ruleset = z.infer<typeof rulesetSchema>;
