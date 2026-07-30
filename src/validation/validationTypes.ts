import { z } from 'zod';

import {
  localizedTextSchema,
  rulesetSourceSchema,
  validationModeSchema,
  type LocalizedText,
  type RulesetEntry,
} from '../domain';

export const validationSeveritySchema = z.enum(['error', 'warning', 'manual', 'info']);

export const validationRuleReferenceSchema = z
  .object({
    ruleId: z.string().regex(/^[a-z][a-zA-Z0-9.]*$/u),
    section: z.string().regex(/^3\.\d+(?:\.\d+)?$/u),
    page: z.number().int().min(13).max(18),
    source: rulesetSourceSchema,
    tolerance: z.number().min(0).max(1).nullable(),
    validationMode: validationModeSchema,
  })
  .strict();

export const validationFindingSchema = z
  .object({
    id: z.string().min(1).max(300),
    severity: validationSeveritySchema,
    elementId: z.string().min(1).max(120),
    messages: localizedTextSchema,
    rule: validationRuleReferenceSchema,
    suggestedCorrection: localizedTextSchema,
    actualValue: z.union([z.number().finite(), z.string(), z.boolean()]).optional(),
    expectedValue: z.union([z.number().finite(), z.string(), z.boolean()]).optional(),
  })
  .strict();

export const validationSummarySchema = z
  .object({
    errors: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    manualChecks: z.number().int().nonnegative(),
    information: z.number().int().nonnegative(),
    isValid: z.boolean(),
  })
  .strict();

export const validationReportSchema = z
  .object({
    rulesetVersion: z.string().min(1),
    findings: z.array(validationFindingSchema),
    summary: validationSummarySchema,
  })
  .strict();

export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationRuleReference = z.infer<typeof validationRuleReferenceSchema>;
export type ValidationFinding = z.infer<typeof validationFindingSchema>;
export type ValidationSummary = z.infer<typeof validationSummarySchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;

export interface CreateValidationFindingInput {
  id: string;
  severity: ValidationSeverity;
  elementId: string;
  messages: LocalizedText;
  rule: RulesetEntry;
  suggestedCorrection: LocalizedText;
  actualValue?: string | number | boolean;
  expectedValue?: string | number | boolean;
}

const severityOrder: Readonly<Record<ValidationSeverity, number>> = {
  error: 0,
  warning: 1,
  manual: 2,
  info: 3,
};

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createValidationFinding(input: CreateValidationFindingInput): ValidationFinding {
  return validationFindingSchema.parse({
    id: input.id,
    severity: input.severity,
    elementId: input.elementId,
    messages: input.messages,
    rule: {
      ruleId: input.rule.id,
      section: input.rule.section,
      page: input.rule.page,
      source: input.rule.source,
      tolerance: input.rule.tolerance,
      validationMode: input.rule.validationMode,
    },
    suggestedCorrection: input.suggestedCorrection,
    ...(input.actualValue === undefined ? {} : { actualValue: input.actualValue }),
    ...(input.expectedValue === undefined ? {} : { expectedValue: input.expectedValue }),
  });
}

export function sortValidationFindings(
  findings: readonly ValidationFinding[],
): ValidationFinding[] {
  return [...findings].sort(
    (left, right) =>
      severityOrder[left.severity] - severityOrder[right.severity] ||
      compareCodeUnits(left.elementId, right.elementId) ||
      compareCodeUnits(left.rule.ruleId, right.rule.ruleId) ||
      compareCodeUnits(left.id, right.id),
  );
}

export function summarizeValidationFindings(
  findings: readonly ValidationFinding[],
): ValidationSummary {
  const summary = {
    errors: 0,
    warnings: 0,
    manualChecks: 0,
    information: 0,
  };

  for (const finding of findings) {
    if (finding.severity === 'error') {
      summary.errors += 1;
    } else if (finding.severity === 'warning') {
      summary.warnings += 1;
    } else if (finding.severity === 'manual') {
      summary.manualChecks += 1;
    } else {
      summary.information += 1;
    }
  }

  return validationSummarySchema.parse({
    ...summary,
    isValid: summary.errors === 0,
  });
}
