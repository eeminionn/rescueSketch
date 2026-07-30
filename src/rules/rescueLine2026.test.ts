import { rulesetSchema } from '../domain/ruleset';
import {
  getRescueLine2026Rule,
  getRescueLine2026Value,
  rescueLine2026RuleIds,
  rescueLine2026Ruleset,
} from './rescueLine2026';

describe('RoboCupJunior Rescue Line 2026 ruleset', () => {
  it('preserves the verified source and bilingual disclaimer', () => {
    expect(rescueLine2026Ruleset.source).toMatchObject({
      title: 'RoboCupJunior Rescue Line Rules 2026',
      revision: '2026-03-29',
      language: 'en',
      sha256: 'd1a60d29269245a307b0a0023ebdb3c8bca464a2b7616b0482b5bcee5398d9e6',
    });
    expect(rescueLine2026Ruleset.disclaimer.es).toContain('no oficial');
    expect(rulesetSchema.safeParse(rescueLine2026Ruleset).success).toBe(true);
  });

  it('encodes the principal dimensional limits from pages 13–18', () => {
    const expectedValues: Record<string, number | boolean> = {
      'field.tileWidthMm': 300,
      'field.minimumCourseTiles': 8,
      'bridge.pillarWidthMaxMm': 25,
      'bridge.passageWidthMinMm': 250,
      'line.widthMinMm': 10,
      'line.widthMaxMm': 20,
      'line.gapLengthMaxMm': 200,
      'line.straightBeforeGapMinMm': 50,
      'line.clearanceMinMm': 100,
      'goalTape.widthMm': 25,
      'goalTape.lengthMm': 300,
      'speedBump.heightMaxMm': 10,
      'debris.heightMaxMm': 3,
      'obstacle.heightMinMm': 150,
      'intersection.markerWidthMm': 25,
      'intersection.branchCountMin': 3,
      'intersection.branchCountMax': 4,
      'ramp.inclineMaxDeg': 25,
      'ramp.immediatePeakAllowed': false,
      'seesaw.inclineExclusiveMaxDeg': 20,
      'evacuation.widthMm': 1200,
      'evacuation.heightMm': 900,
      'evacuation.wallHeightMinMm': 100,
      'evacuation.entranceTapeLengthMm': 250,
      'evacuation.pointLegLengthMm': 300,
      'evacuation.pointWallWidthMm': 60,
      'victim.diameterMinMm': 40,
      'victim.diameterMaxMm': 50,
      'victim.weightMaxGram': 80,
      'victim.livingCount': 2,
      'victim.deadCount': 1,
      'field.measurementToleranceRatio': 0.1,
    };

    for (const [ruleId, expectedValue] of Object.entries(expectedValues)) {
      expect(getRescueLine2026Rule(ruleId).value).toBe(expectedValue);
    }
  });

  it('attaches provenance and the correct tolerance semantics to every entry', () => {
    expect(rescueLine2026RuleIds.length).toBeGreaterThanOrEqual(45);

    for (const entry of rescueLine2026Ruleset.entries) {
      expect(entry.source.sha256).toBe(rescueLine2026Ruleset.source.sha256);
      expect(entry.page).toBeGreaterThanOrEqual(13);
      expect(entry.page).toBeLessThanOrEqual(18);
      expect(entry.title.es.length).toBeGreaterThan(0);
      expect(entry.title.en.length).toBeGreaterThan(0);

      if (entry.unit === 'count') {
        expect(entry.tolerance).toBeNull();
      }
    }

    expect(getRescueLine2026Value<number>('line.widthMinMm')).toMatchObject({
      value: 10,
      unit: 'mm',
      tolerance: 0.1,
      section: '3.3',
      page: 14,
      validationMode: 'automated',
    });
  });

  it('fails closed when a rule identifier is unknown', () => {
    expect(() => getRescueLine2026Rule('line.inventedRadiusMm')).toThrow(RangeError);
  });
});
