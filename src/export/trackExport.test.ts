import { parseTrackDocument, serializeTrackDocument, type TrackDocumentV1 } from '../domain';
import { createTrackJson, createTrackJsonSchema } from './trackJson';
import { createTrackSvg } from './renderTrackSvg';
import { exportTrackPng } from './trackPng';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function documentWithTile(): TrackDocumentV1 {
  const document = parseTrackDocument({
    schemaVersion: '1.0.0',
    rulesetVersion: '2026.1',
    catalogVersion: '2026.1',
    canvas: {
      widthMm: 600,
      heightMm: 300,
      tileSizeMm: 300,
      gridSizeMm: 10,
    },
    levels: [{ id: 'level-0', name: 'Ground', elevationMm: 0 }],
    tiles: [
      {
        id: 'line-1',
        catalogItemId: 'straightLine',
        levelId: 'level-0',
        position: { x: 0, y: 0 },
        rotation: 1,
        geometry: [],
        parameters: { lineOffsetMm: 150 },
      },
    ],
    structures: [],
    annotations: [],
    license: { spdxIdentifier: 'CC-BY-4.0', acceptedAt },
  });

  return document;
}

describe('track exporters', () => {
  it('produces byte-stable canonical JSON and the generated schema', () => {
    const document = documentWithTile();
    const json = createTrackJson(document);
    const parsedJson = JSON.parse(json) as unknown;
    const roundTripped = parseTrackDocument(parsedJson);
    const schema = JSON.parse(createTrackJsonSchema()) as unknown;

    expect(json).toBe(serializeTrackDocument(roundTripped));
    expect(schema).toHaveProperty('$schema', 'https://json-schema.org/draft/2020-12/schema');
    expect(schema).toHaveProperty('properties.schemaVersion');
  });

  it('renders a physical SVG with safe named layers, metadata, grid and transformed pieces', () => {
    const svg = createTrackSvg(documentWithTile(), {
      backgroundColor: '#fefdf8',
    });

    expect(svg).toContain('width="600mm"');
    expect(svg).toContain('height="300mm"');
    expect(svg).toContain('viewBox="0 0 600 300"');
    expect(svg).toContain('<metadata>');
    expect(svg).toContain('id="background"');
    expect(svg).toContain('id="grid"');
    expect(svg).toContain('id="tiles"');
    expect(svg).toContain('data-element-id="line-1"');
    expect(svg).toContain('rotate(90)');
    expect(svg).not.toContain('<image');
    expect(() => createTrackSvg(documentWithTile(), { backgroundColor: 'url(evil)' })).toThrow(
      RangeError,
    );
  });

  it('rejects invalid PNG scale before touching browser rasterization', async () => {
    await expect(exportTrackPng(documentWithTile(), { pixelScale: 0 })).rejects.toThrow(RangeError);
  });

  it('reports a clear capability error when the browser has no canvas implementation', async () => {
    vi.stubGlobal('document', { createElement: () => ({}) });

    await expect(exportTrackPng(documentWithTile())).rejects.toThrow(
      'PNG export requires a browser canvas implementation.',
    );

    vi.unstubAllGlobals();
  });
});
