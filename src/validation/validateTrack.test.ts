import { createEmptyTrackDocument, type TrackDocumentV1, type TrackTile } from '../domain';
import { validateTrackDocument } from './validateTrack';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function createStraightTile(parameters: TrackTile['parameters'] = {}): TrackTile {
  return {
    id: 'straight-1',
    catalogItemId: 'straightLine',
    levelId: 'level-0',
    position: { x: 0, y: 0 },
    rotation: 0,
    geometry: [],
    parameters,
  };
}

function createDocumentWithRoute(parameters: TrackTile['parameters'] = {}): TrackDocumentV1 {
  return {
    ...createEmptyTrackDocument(acceptedAt),
    tiles: [createStraightTile(parameters)],
  };
}

describe('validateTrackDocument', () => {
  it('aggregates document, catalog, and manual checks into one traced report', () => {
    const report = validateTrackDocument(createDocumentWithRoute({ lineWidthMm: 21 }));

    expect(report.rulesetVersion).toBe('2026.1');
    expect(report.summary).toEqual({
      errors: 4,
      warnings: 0,
      manualChecks: 1,
      information: 0,
      isValid: false,
    });
    expect(report.findings.map(({ id }) => id)).toEqual([
      'catalogParameter.straight-1.lineWidthMm.maximum',
      'track:field.minimumCourseTiles',
      'track:victim.deadCount',
      'track:victim.livingCount',
      'manual.track.lineClearanceAndContinuity',
    ]);

    for (const finding of report.findings) {
      expect(finding.messages.es).toBeTruthy();
      expect(finding.messages.en).toBeTruthy();
      expect(finding.suggestedCorrection.es).toBeTruthy();
      expect(finding.suggestedCorrection.en).toBeTruthy();
      expect(finding.rule.source.sha256).toHaveLength(64);
    }
  });

  it('can omit checks that require a physical inspection', () => {
    const document = createDocumentWithRoute();
    const withManualChecks = validateTrackDocument(document);
    const withoutManualChecks = validateTrackDocument(document, {
      includeManualChecks: false,
    });

    expect(withManualChecks.summary.manualChecks).toBe(1);
    expect(withoutManualChecks.summary.manualChecks).toBe(0);
    expect(withoutManualChecks.findings.every(({ severity }) => severity !== 'manual')).toBe(true);
    expect(withoutManualChecks.findings.filter(({ severity }) => severity === 'error')).toEqual(
      withManualChecks.findings.filter(({ severity }) => severity === 'error'),
    );
  });

  it('returns stable ordering and unique finding identifiers', () => {
    const document = createDocumentWithRoute({ lineWidthMm: 21 });
    const firstReport = validateTrackDocument(document);
    const secondReport = validateTrackDocument(document);
    const findingIds = firstReport.findings.map(({ id }) => id);

    expect(secondReport).toEqual(firstReport);
    expect(new Set(findingIds).size).toBe(findingIds.length);
  });

  it('rejects an invalid document before evaluating rules', () => {
    const document = createDocumentWithRoute();
    const invalidDocument = {
      ...document,
      canvas: {
        ...document.canvas,
        widthMm: -1,
      },
    } as TrackDocumentV1;

    expect(() => validateTrackDocument(invalidDocument)).toThrow();
  });

  it('rejects unsupported ruleset and catalog versions instead of applying 2026 rules', () => {
    const document = createDocumentWithRoute();

    expect(() =>
      validateTrackDocument({
        ...document,
        rulesetVersion: '2025.1',
      }),
    ).toThrow('Unsupported rulesetVersion');
    expect(() =>
      validateTrackDocument({
        ...document,
        catalogVersion: 'community-draft',
      }),
    ).toThrow('Unsupported catalogVersion');
  });

  it('rejects unknown catalog identifiers and structural items stored as tiles', () => {
    const document = createDocumentWithRoute();

    expect(() =>
      validateTrackDocument({
        ...document,
        tiles: [
          {
            ...document.tiles[0]!,
            catalogItemId: 'communityPrototype',
          },
        ],
      }),
    ).toThrow('Unknown RescueSketch catalog item');
    expect(() =>
      validateTrackDocument({
        ...document,
        tiles: [
          {
            ...document.tiles[0]!,
            catalogItemId: 'ramp',
          },
        ],
      }),
    ).toThrow('must be stored in TrackDocumentV1.structures');
  });
});
