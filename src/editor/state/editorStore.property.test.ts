import fc from 'fast-check';

import { createEmptyTrackDocument, parseTrackDocument, serializeTrackDocument } from '../../domain';
import { createEditorStore } from './editorStore';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function createSingleTileDocument(position = { x: 0, y: 0 }) {
  const document = createEmptyTrackDocument(acceptedAt);

  return parseTrackDocument({
    ...document,
    tiles: [
      {
        id: 'tile-property',
        catalogItemId: 'straight',
        levelId: 'level-0',
        position,
        rotation: 0,
        geometry: [],
        parameters: {},
      },
    ],
  });
}

describe('editor state properties', () => {
  it('four clockwise rotations always recover the exact document', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20_000 }),
        fc.integer({ min: 0, max: 20_000 }),
        (x, y) => {
          const initialDocument = createSingleTileDocument({ x, y });
          const store = createEditorStore(initialDocument);
          store.getState().setSelection(['tile-property']);

          for (let turn = 0; turn < 4; turn += 1) {
            store.getState().rotateSelection('clockwise');
          }

          expect(serializeTrackDocument(store.getState().document)).toBe(
            serializeTrackDocument(initialDocument),
          );
        },
      ),
      { numRuns: 80 },
    );
  });

  it('snapping produces grid multiples within half a grid step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20_000 }),
        fc.integer({ min: 0, max: 20_000 }),
        fc.integer({ min: 1, max: 100 }),
        (x, y, gridSizeMm) => {
          const document = createSingleTileDocument();
          const store = createEditorStore({
            ...document,
            canvas: {
              ...document.canvas,
              gridSizeMm,
            },
          });
          store.getState().moveElementTo('tile-property', { x, y });
          const position = store.getState().document.tiles[0]?.position;

          if (position === undefined) {
            throw new Error('Property fixture tile is missing.');
          }

          expect(position.x % gridSizeMm).toBe(0);
          expect(position.y % gridSizeMm).toBe(0);
          expect(Math.abs(position.x - x)).toBeLessThanOrEqual(gridSizeMm / 2);
          expect(Math.abs(position.y - y)).toBeLessThanOrEqual(gridSizeMm / 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('keeps bounded history and redoes every retained state deterministically', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.array(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 30 }),
        (historyLimit, movements) => {
          const store = createEditorStore(createSingleTileDocument(), { historyLimit });
          store.getState().setSelection(['tile-property']);

          for (const movement of movements) {
            store.getState().moveSelectionBy({ x: movement, y: 0 }, { snap: false });
          }

          const finalDocument = serializeTrackDocument(store.getState().document);
          const retainedHistoryLength = Math.min(historyLimit, movements.length);
          expect(store.getState().history.past).toHaveLength(retainedHistoryLength);

          for (let index = 0; index < retainedHistoryLength; index += 1) {
            expect(store.getState().undo()).toBe(true);
          }
          expect(store.getState().undo()).toBe(false);

          for (let index = 0; index < retainedHistoryLength; index += 1) {
            expect(store.getState().redo()).toBe(true);
          }
          expect(store.getState().redo()).toBe(false);
          expect(serializeTrackDocument(store.getState().document)).toBe(finalDocument);
        },
      ),
      { numRuns: 80 },
    );
  });
});
