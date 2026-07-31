import { createEmptyTrackDocument, type TrackDocumentV1 } from '../domain';
import { dxfLayers, exportTrackDxfResult } from './trackDxf';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function fixture(): TrackDocumentV1 {
  return {
    ...createEmptyTrackDocument(acceptedAt),
    tiles: [
      {
        id: 'curve-1',
        catalogItemId: 'curveLine',
        levelId: 'level-0',
        position: { x: 300, y: 300 },
        rotation: 1,
        geometry: [],
        parameters: {},
      },
      {
        id: 'line-1',
        catalogItemId: 'straightLine',
        levelId: 'level-0',
        position: { x: 0, y: 0 },
        rotation: 0,
        geometry: [],
        parameters: {},
      },
    ],
  };
}

describe('track DXF exporter', () => {
  it('emits deterministic R2000 millimetre content with all fabrication layers', () => {
    const first = exportTrackDxfResult(fixture());
    const second = exportTrackDxfResult(fixture());

    expect(first.content).toBe(second.content);
    expect(first.content).toContain('AC1015');
    expect(first.content).toContain('$INSUNITS');
    expect(first.content).toContain('LINE_CENTER');
    expect(first.content).toContain('ARC');
    for (const layer of dxfLayers) expect(first.content).toContain(layer);
  });

  it('falls back to persisted geometry and reports the degradation', () => {
    const document = {
      ...createEmptyTrackDocument(acceptedAt),
      tiles: [
        {
          id: 'unknown-1',
          catalogItemId: 'unknownCatalog',
          levelId: 'level-0',
          position: { x: 0, y: 0 },
          rotation: 0 as const,
          geometry: [{ kind: 'line' as const, start: { x: 0, y: 0 }, end: { x: 20, y: 0 } }],
          parameters: {},
        },
      ],
    } as TrackDocumentV1;

    const result = exportTrackDxfResult(document);
    expect(result.warnings[0]).toContain('unknown-1');
    expect(result.content).toContain('LINE');
  });
});
