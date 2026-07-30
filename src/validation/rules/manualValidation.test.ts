import {
  createEmptyTrackDocument,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../../domain';
import { createManualValidationFindings } from './manualValidation';

const acceptedAt = '2026-07-30T12:00:00.000Z';

function tile(
  id: string,
  catalogItemId: string,
  parameters: TrackTile['parameters'] = {},
): TrackTile {
  return {
    id,
    catalogItemId,
    levelId: 'level-0',
    position: { x: 0, y: 0 },
    rotation: 0,
    geometry: [],
    parameters,
  };
}

function structure(
  id: string,
  kind: TrackStructure['kind'],
  parameters: TrackStructure['parameters'] = {},
): TrackStructure {
  return {
    id,
    kind,
    levelId: 'level-0',
    position: { x: 0, y: 0 },
    rotation: 0,
    geometry: [],
    parameters,
  };
}

function completeManualFixture(): TrackDocumentV1 {
  return {
    ...createEmptyTrackDocument(acceptedAt),
    tiles: [
      tile('line-2', 'curveLine'),
      tile('line-1', 'straightLine'),
      tile('living-1', 'livingVictim'),
      tile('dead-1', 'deadVictim'),
    ],
    structures: [
      structure('seesaw-1', 'seesaw'),
      structure('ramp-1', 'ramp'),
      structure('obstacle-1', 'obstacle'),
      structure('debris-1', 'debris'),
      structure('evacuation-1', 'evacuationZone'),
    ],
  };
}

describe('createManualValidationFindings', () => {
  it('returns no generic noise for an empty document', () => {
    expect(createManualValidationFindings(createEmptyTrackDocument(acceptedAt))).toEqual([]);
  });

  it('ignores unknown catalog items instead of inventing contextual rules', () => {
    const document: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      tiles: [tile('unknown-1', 'futureCatalogItem')],
    };

    expect(createManualValidationFindings(document)).toEqual([]);
  });

  it('emits a concise traced set for checks the document cannot safely automate', () => {
    const findings = createManualValidationFindings(completeManualFixture());
    const ruleIds = findings.map(({ rule }) => rule.ruleId);

    expect(new Set(findings.map(({ id }) => id)).size).toBe(findings.length);
    expect(findings).toHaveLength(15);
    expect(new Set(ruleIds)).toEqual(
      new Set([
        'floor.tileStepHeightMaxMm',
        'line.clearanceMinMm',
        'debris.heightMaxMm',
        'obstacle.edgeClearanceMinMm',
        'obstacle.evacuationWallClearanceMinMm',
        'ramp.immediatePeakAllowed',
        'seesaw.lineMustBeStraight',
        'seesaw.scoringElementsAllowed',
        'victim.diameterMinMm',
        'victim.diameterMaxMm',
        'victim.weightMaxGram',
        'victim.randomPlacement',
      ]),
    );
    expect(ruleIds).not.toContain('line.widthMinMm');
    expect(ruleIds).not.toContain('ramp.inclineMaxDeg');
    expect(findings.every(({ severity }) => severity === 'manual' || severity === 'info')).toBe(
      true,
    );
    expect(
      findings.every(
        ({ messages, suggestedCorrection, rule }) =>
          messages.es.length > 0 &&
          messages.en.length > 0 &&
          suggestedCorrection.es.length > 0 &&
          suggestedCorrection.en.length > 0 &&
          rule.page >= 13 &&
          rule.source.sha256.length === 64,
      ),
    ).toBe(true);
  });

  it('ties contextual checks to their structure and victim catalog elements', () => {
    const findings = createManualValidationFindings(completeManualFixture());

    expect(
      findings.find(({ rule }) => rule.ruleId === 'obstacle.edgeClearanceMinMm')?.elementId,
    ).toBe('obstacle-1');
    expect(
      findings.find(({ rule }) => rule.ruleId === 'ramp.immediatePeakAllowed')?.elementId,
    ).toBe('ramp-1');
    expect(
      findings.find(({ rule }) => rule.ruleId === 'seesaw.scoringElementsAllowed')?.elementId,
    ).toBe('seesaw-1');
    expect(
      findings
        .filter(({ rule }) => rule.ruleId === 'victim.diameterMinMm')
        .map(({ elementId }) => elementId),
    ).toEqual(['dead-1', 'living-1']);
    expect(findings.find(({ id }) => id === 'manual.track.victimRandomPlacement')?.elementId).toBe(
      'track',
    );
  });

  it('keeps every physical victim check keyed to its own stable element id', () => {
    const original: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      tiles: [tile('victim-z', 'livingVictim')],
    };
    const withEarlierVictim: TrackDocumentV1 = {
      ...original,
      tiles: [tile('victim-a', 'deadVictim'), ...original.tiles],
    };

    const originalVictimFindings = createManualValidationFindings(original).filter(
      ({ elementId }) => elementId === 'victim-z',
    );
    const updatedVictimFindings = createManualValidationFindings(withEarlierVictim).filter(
      ({ elementId }) => elementId === 'victim-z',
    );

    expect(originalVictimFindings).toHaveLength(3);
    expect(updatedVictimFindings).toEqual(originalVictimFindings);
    expect(originalVictimFindings.map(({ id }) => id)).toEqual([
      'manual.victim-z.victim.diameterMaxMm',
      'manual.victim-z.victim.diameterMinMm',
      'manual.victim-z.victim.weightMaxGram',
    ]);
  });

  it('keeps findings deterministic when document arrays are reordered', () => {
    const document = completeManualFixture();
    const reorderedDocument: TrackDocumentV1 = {
      ...document,
      tiles: [...document.tiles].reverse(),
      structures: [...document.structures].reverse(),
    };

    expect(createManualValidationFindings(reorderedDocument)).toEqual(
      createManualValidationFindings(document),
    );
  });

  it('requests victim setup checks for an evacuation zone without drawn victims', () => {
    const document: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      structures: [structure('evacuation-1', 'evacuationZone')],
    };
    const findings = createManualValidationFindings(document);

    expect(findings.map(({ rule }) => rule.ruleId)).toEqual(['victim.randomPlacement']);
    expect(findings.every(({ elementId }) => elementId === 'track')).toBe(true);
    expect(findings.map(({ id }) => id)).toEqual(['manual.track.victimRandomPlacement']);
    expect(findings.every(({ expectedValue }) => expectedValue === true)).toBe(true);
    expect(
      findings.every(
        ({ messages }) =>
          !/exact(?:ly)?|count|exactamente|cuent/iu.test(`${messages.es} ${messages.en}`),
      ),
    ).toBe(true);
  });

  it('requests missing boolean and spatial evidence for contextual rules', () => {
    const document: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      tiles: [
        tile('intersection-1', 'threeWayIntersection'),
        tile('entrance-1', 'evacuationEntrance'),
        tile('exit-1', 'evacuationExit'),
      ],
      structures: [structure('ramp-1', 'ramp'), structure('seesaw-1', 'seesaw')],
    };
    const findings = createManualValidationFindings(document);
    const contextualRuleIds = findings
      .filter(({ id }) => id.endsWith('.contextEvidence'))
      .map(({ rule }) => rule.ruleId);

    expect(contextualRuleIds).toEqual([
      'evacuation.lineEndsAtEntrance',
      'evacuation.lineResumesAtExit',
      'intersection.allowedInEvacuation',
      'ramp.immediatePeakAllowed',
      'seesaw.lineMustBeStraight',
      'seesaw.scoringElementsAllowed',
    ]);
    expect(
      findings
        .filter(({ id }) => id.endsWith('.contextEvidence'))
        .every(({ actualValue }) => actualValue === 'missing'),
    ).toBe(true);
  });

  it('suppresses contextual manual checks once matching boolean evidence is recorded', () => {
    const document: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      tiles: [
        tile('intersection-1', 'threeWayIntersection', { allowedInEvacuation: false }),
        tile('entrance-1', 'evacuationEntrance', { lineEndsAtEntrance: true }),
        tile('exit-1', 'evacuationExit', { lineResumesAtExit: true }),
      ],
      structures: [
        structure('ramp-1', 'ramp', { immediatePeakAllowed: false }),
        structure('seesaw-1', 'seesaw', {
          lineMustBeStraight: true,
          scoringElementsAllowed: false,
        }),
      ],
    };
    const findings = createManualValidationFindings(document);

    expect(findings.filter(({ id }) => id.endsWith('.contextEvidence'))).toEqual([]);
  });

  it('leaves contradictory recorded evidence to the automated document validator', () => {
    const document: TrackDocumentV1 = {
      ...createEmptyTrackDocument(acceptedAt),
      structures: [structure('ramp-1', 'ramp', { immediatePeakAllowed: true })],
    };
    const findings = createManualValidationFindings(document);

    expect(findings).toEqual([]);
  });
});
