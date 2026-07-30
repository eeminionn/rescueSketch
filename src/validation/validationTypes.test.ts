import { getRescueLine2026Rule } from '../rules';
import {
  createValidationFinding,
  sortValidationFindings,
  summarizeValidationFindings,
  validationFindingSchema,
} from './validationTypes';

function finding(id: string, severity: 'error' | 'warning' | 'manual' | 'info') {
  return createValidationFinding({
    id,
    severity,
    elementId: id.includes('track') ? 'track' : 'tile-1',
    messages: {
      es: `Mensaje ${id}`,
      en: `Message ${id}`,
    },
    rule: getRescueLine2026Rule('line.widthMinMm'),
    suggestedCorrection: {
      es: 'Corrige la medida.',
      en: 'Correct the measurement.',
    },
    actualValue: 8,
    expectedValue: 10,
  });
}

describe('validation finding contracts', () => {
  it('preserves the complete source reference and bilingual correction', () => {
    const result = validationFindingSchema.parse(finding('tile-1:line.widthMinMm', 'error'));

    expect(result.rule.ruleId).toBe('line.widthMinMm');
    expect(result.rule.section).toBe('3.3');
    expect(result.rule.page).toBe(14);
    expect(result.rule.source.sha256).toHaveLength(64);
    expect(result.messages.es).toBeTruthy();
    expect(result.messages.en).toBeTruthy();
    expect(result.suggestedCorrection.es).toBeTruthy();
    expect(result.suggestedCorrection.en).toBeTruthy();
  });

  it('sorts deterministically by severity, element, rule, and id', () => {
    const findings = [
      finding('track:manual', 'manual'),
      finding('tile-1:warning', 'warning'),
      finding('tile-1:error-b', 'error'),
      finding('tile-1:error-a', 'error'),
      finding('track:info', 'info'),
    ];

    expect(sortValidationFindings(findings).map(({ id }) => id)).toEqual([
      'tile-1:error-a',
      'tile-1:error-b',
      'tile-1:warning',
      'track:manual',
      'track:info',
    ]);
  });

  it('summarizes blocking and non-blocking findings', () => {
    expect(
      summarizeValidationFindings([
        finding('tile-1:error', 'error'),
        finding('tile-1:warning', 'warning'),
        finding('track:manual', 'manual'),
        finding('track:info', 'info'),
      ]),
    ).toEqual({
      errors: 1,
      warnings: 1,
      manualChecks: 1,
      information: 1,
      isValid: false,
    });

    expect(summarizeValidationFindings([]).isValid).toBe(true);
  });
});
