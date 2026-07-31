import { createEmptyTrackDocument, type TrackDocumentV1 } from '../domain';
import { validateTrackDocument } from '../validation';
import { createTrackDxf, createTrackJson, createTrackSvg } from './index';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function documentFixture(): TrackDocumentV1 {
  return {
    ...createEmptyTrackDocument(acceptedAt),
    tiles: [
      {
        id: 'straight-1',
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

describe('v0.3 fabrication workflow', () => {
  it('validates once and produces stable JSON, physical SVG, and DXF artifacts', () => {
    const document = documentFixture();
    const validation = validateTrackDocument(document);
    expect(validation.summary.isValid).toBe(false);
    expect(validation.findings.length).toBeGreaterThan(0);

    const json = createTrackJson(document);
    const svg = createTrackSvg(document, { includeGrid: false });
    const dxf = createTrackDxf(document);

    expect(json).toBe(createTrackJson(JSON.parse(json) as TrackDocumentV1));
    expect(svg).toContain('width="2400mm"');
    expect(svg).toContain('height="1800mm"');
    expect(dxf).toContain('AC1015');
    expect(dxf).toContain('LINE_CENTER');
  });

  it('rejects malformed documents before any export can be persisted', () => {
    const malformed = { ...documentFixture(), canvas: { ...documentFixture().canvas, widthMm: 0 } };
    expect(() => createTrackJson(malformed)).toThrow();
    expect(() => createTrackSvg(malformed)).toThrow();
    expect(() => createTrackDxf(malformed)).toThrow();
  });
});
