import { z } from 'zod';

import rawRuleset from '../../rulesets/rcj-rescue-line-2026.json';
import {
  rulesetEntrySchema,
  rulesetBaseSchema,
  rulesetSchema,
  type Ruleset,
  type RulesetEntry,
  type RulesetValue,
} from '../domain/ruleset';

const rawRulesetEntrySchema = rulesetEntrySchema.omit({ source: true });
const rawRulesetSchema = rulesetBaseSchema
  .omit({ entries: true })
  .extend({
    entries: z.array(rawRulesetEntrySchema).min(1),
  })
  .strict();

const parsedRawRuleset = rawRulesetSchema.parse(rawRuleset);

export const rescueLine2026Ruleset: Ruleset = rulesetSchema.parse({
  ...parsedRawRuleset,
  entries: parsedRawRuleset.entries.map((entry) => ({
    ...entry,
    source: parsedRawRuleset.source,
  })),
});

const entriesById = new Map(
  rescueLine2026Ruleset.entries.map((entry) => [entry.id, entry] as const),
);

export function getRescueLine2026Rule(ruleId: string): RulesetEntry {
  const entry = entriesById.get(ruleId);

  if (entry === undefined) {
    throw new RangeError(`Unknown Rescue Line 2026 rule: ${ruleId}`);
  }

  return entry;
}

export function getRescueLine2026Value<T extends string | number | boolean>(
  ruleId: string,
): RulesetValue<T> {
  return getRescueLine2026Rule(ruleId) as RulesetEntry & RulesetValue<T>;
}

export const rescueLine2026RuleIds = Object.freeze([...entriesById.keys()]);
