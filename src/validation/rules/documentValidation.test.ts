import {
  createEmptyTrackDocument,
  parseTrackDocument,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../../domain';
import { validateDocumentRules } from './documentValidation';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function createTile(
  id: string,
  catalogItemId: string,
  x: number,
  y: number,
  parameters: TrackTile['parameters'] = {},
): TrackTile {
  return {
    id,
    catalogItemId,
    levelId: 'level-0',
    position: { x, y },
    rotation: 0,
    geometry: [],
    parameters,
  };
}

function createStructure(
  id: string,
  kind: TrackStructure['kind'],
  parameters: TrackStructure['parameters'] = {},
): TrackStructure {
  return {
    id,
    kind,
    levelId: 'level-0',
    position: { x: 0, y: 1_200 },
    rotation: 0,
    geometry: [],
    parameters,
  };
}

function createCompliantDocument(): TrackDocumentV1 {
  const document = createEmptyTrackDocument(acceptedAt);
  const courseTiles = Array.from({ length: 9 }, (_, index) =>
    createTile(
      `course-${index + 1}`,
      'straightLine',
      (index % 4) * 300,
      Math.floor(index / 4) * 300,
      {
        tileWidthMm: 300,
        tileHeightMm: 300,
      },
    ),
  );

  return parseTrackDocument({
    ...document,
    tiles: [
      ...courseTiles,
      createTile('goal', 'goalTile', 1_200, 0),
      createTile('living-1', 'livingVictim', 0, 600),
      createTile('living-2', 'livingVictim', 300, 600),
      createTile('dead-1', 'deadVictim', 600, 600),
    ],
    structures: [
      createStructure('evacuation-zone', 'evacuationZone'),
      createStructure('ramp', 'ramp', {
        inclineDeg: 25,
        immediatePeakAllowed: false,
      }),
      createStructure('seesaw', 'seesaw', {
        inclineDeg: 19.999,
        lineMustBeStraight: true,
        scoringElementsAllowed: false,
      }),
    ],
  });
}

function withDocument(
  document: TrackDocumentV1,
  update: Partial<TrackDocumentV1>,
): TrackDocumentV1 {
  return parseTrackDocument({
    ...document,
    ...update,
  });
}

function findingIds(document: TrackDocumentV1): string[] {
  return validateDocumentRules(document).map(({ id }) => id);
}

describe('validateDocumentRules', () => {
  it('accepts positive fixtures for every document-level automated check', () => {
    expect(validateDocumentRules(createCompliantDocument())).toEqual([]);
  });

  it('counts only field tiles and excludes one start tile and the goal', () => {
    const document = createCompliantDocument();
    const incompleteDocument = withDocument(document, {
      tiles: document.tiles.filter(({ id }) => id !== 'course-8'),
    });

    expect(findingIds(incompleteDocument)).toEqual(['track:field.minimumCourseTiles']);

    const finding = validateDocumentRules(incompleteDocument)[0];
    expect(finding).toMatchObject({
      elementId: 'track',
      actualValue: 7,
      expectedValue: 8,
      rule: {
        ruleId: 'field.minimumCourseTiles',
        section: '3.1',
        page: 13,
      },
    });
    expect(finding?.messages.es).toContain('7 baldosas');
    expect(finding?.suggestedCorrection.es).toContain('1 baldosa');
    expect(finding?.messages.en).toContain('7 course tiles');
    expect(finding?.suggestedCorrection.en).toContain('1 course tile');
  });

  it('requires exactly two living victims and one dead victim', () => {
    const document = createCompliantDocument();
    const invalidVictims = withDocument(document, {
      tiles: [
        ...document.tiles.filter(({ id }) => id !== 'living-2' && id !== 'dead-1'),
        createTile('dead-2', 'deadVictim', 900, 600),
        createTile('dead-3', 'deadVictim', 1_200, 600),
      ],
    });
    const findings = validateDocumentRules(invalidVictims);

    expect(findings.map(({ id }) => id)).toEqual([
      'track:victim.deadCount',
      'track:victim.livingCount',
    ]);
    expect(
      findings.map(({ rule }) => ({
        ruleId: rule.ruleId,
        validationMode: rule.validationMode,
      })),
    ).toEqual([
      { ruleId: 'victim.deadCount', validationMode: 'automated' },
      { ruleId: 'victim.livingCount', validationMode: 'automated' },
    ]);
  });

  it('rejects contradictory intersection and evacuation route evidence', () => {
    const document = createCompliantDocument();
    const invalidContext = withDocument(document, {
      tiles: [
        ...document.tiles,
        createTile('entrance', 'evacuationEntrance', 0, 900, {
          lineEndsAtEntrance: false,
        }),
        createTile('exit', 'evacuationExit', 300, 900, {
          lineResumesAtExit: false,
        }),
        createTile('intersection', 'threeWayIntersection', 600, 900, {
          allowedInEvacuation: true,
        }),
      ],
    });

    expect(findingIds(invalidContext)).toEqual([
      'entrance:evacuation.lineEndsAtEntrance',
      'exit:evacuation.lineResumesAtExit',
      'intersection:intersection.allowedInEvacuation',
    ]);
  });

  it('validates stored ramp context without duplicating numeric catalog limits', () => {
    const document = createCompliantDocument();
    const invalidRamp = withDocument(document, {
      structures: document.structures.map((structure) =>
        structure.kind === 'ramp'
          ? {
              ...structure,
              parameters: {
                inclineDeg: 25.001,
                immediatePeakAllowed: true,
              },
            }
          : structure,
      ),
    });
    const unevidencedRamp = withDocument(document, {
      structures: document.structures.map((structure) =>
        structure.kind === 'ramp'
          ? {
              ...structure,
              parameters: {
                inclineDeg: 'not-measured',
              },
            }
          : structure,
      ),
    });

    expect(findingIds(invalidRamp)).toEqual(['ramp:ramp.immediatePeakAllowed']);
    expect(findingIds(unevidencedRamp)).toEqual([]);
  });

  it('validates stored seesaw context without duplicating numeric catalog limits', () => {
    const document = createCompliantDocument();
    const invalidSeesaw = withDocument(document, {
      structures: document.structures.map((structure) =>
        structure.kind === 'seesaw'
          ? {
              ...structure,
              parameters: {
                inclineDeg: 20,
                lineMustBeStraight: false,
                scoringElementsAllowed: true,
              },
            }
          : structure,
      ),
    });
    const unevidencedSeesaw = withDocument(document, {
      structures: document.structures.map((structure) =>
        structure.kind === 'seesaw'
          ? {
              ...structure,
              parameters: {
                inclineDeg: 'not-measured',
              },
            }
          : structure,
      ),
    });

    expect(findingIds(invalidSeesaw)).toEqual([
      'seesaw:seesaw.lineMustBeStraight',
      'seesaw:seesaw.scoringElementsAllowed',
    ]);
    expect(findingIds(unevidencedSeesaw)).toEqual([]);
  });

  it('returns deterministic bilingual findings with complete source traces', () => {
    const document = createCompliantDocument();
    const invalidDocument = withDocument(document, {
      tiles: document.tiles.filter(({ id }) => id !== 'course-8'),
    });
    const firstRun = validateDocumentRules(invalidDocument);
    const secondRun = validateDocumentRules(invalidDocument);

    expect(secondRun).toEqual(firstRun);

    for (const finding of firstRun) {
      expect(finding.messages.es).toBeTruthy();
      expect(finding.messages.en).toBeTruthy();
      expect(finding.suggestedCorrection.es).toBeTruthy();
      expect(finding.suggestedCorrection.en).toBeTruthy();
      expect(finding.rule.source.sha256).toHaveLength(64);
    }
  });
});
