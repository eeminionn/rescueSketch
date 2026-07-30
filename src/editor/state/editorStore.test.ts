import { createEmptyTrackDocument, parseTrackDocument } from '../../domain';
import { createEditorStore } from './editorStore';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function createDocumentWithTiles() {
  const document = createEmptyTrackDocument(acceptedAt);

  return parseTrackDocument({
    ...document,
    tiles: [
      {
        id: 'tile-a',
        catalogItemId: 'straight',
        levelId: 'level-0',
        position: { x: 0, y: 0 },
        rotation: 0,
        geometry: [],
        parameters: {},
      },
      {
        id: 'tile-b',
        catalogItemId: 'curve',
        levelId: 'level-0',
        position: { x: 300, y: 0 },
        rotation: 0,
        geometry: [],
        parameters: {},
      },
    ],
  });
}

describe('createEditorStore', () => {
  it('inserts on the millimetre grid and expands the canvas by whole tiles', () => {
    const store = createEditorStore(createEmptyTrackDocument(acceptedAt));

    expect(
      store.getState().insertTile({
        id: 'tile-a',
        catalogItemId: 'straight',
        position: { x: 2_397, y: 1_796 },
      }),
    ).toBe(true);

    const state = store.getState();
    expect(state.document.tiles[0]?.position).toEqual({ x: 2_400, y: 1_800 });
    expect(state.document.canvas).toMatchObject({ widthMm: 2_700, heightMm: 2_100 });
    expect(state.selectionIds).toEqual(['tile-a']);
  });

  it('supports deterministic multi-selection and movement for pointer or keyboard input', () => {
    const store = createEditorStore(createDocumentWithTiles());

    store.getState().setSelection(['tile-b']);
    store.getState().setSelection(['tile-a'], 'add');
    expect(store.getState().selectionIds).toEqual(['tile-a', 'tile-b']);

    expect(store.getState().moveSelectionBy({ x: 13, y: 17 })).toBe(true);
    expect(store.getState().document.tiles.map(({ position }) => position)).toEqual([
      { x: 10, y: 20 },
      { x: 310, y: 20 },
    ]);

    store.getState().setSelection(['tile-b'], 'toggle');
    expect(store.getState().selectionIds).toEqual(['tile-a']);
  });

  it('duplicates with stable IDs, then removes the selected copies', () => {
    const store = createEditorStore(createDocumentWithTiles());
    store.getState().setSelection(['tile-a']);

    expect(store.getState().duplicateSelection()).toEqual(['tile-a-copy']);
    store.getState().setSelection(['tile-a']);
    expect(store.getState().duplicateSelection()).toEqual(['tile-a-copy-2']);
    expect(store.getState().document.tiles.map(({ id }) => id)).toEqual([
      'tile-a',
      'tile-b',
      'tile-a-copy',
      'tile-a-copy-2',
    ]);

    expect(store.getState().deleteSelection()).toBe(true);
    expect(store.getState().document.tiles.map(({ id }) => id)).toEqual([
      'tile-a',
      'tile-b',
      'tile-a-copy',
    ]);
    expect(store.getState().selectionIds).toEqual([]);
  });

  it('groups drag updates into one deterministic undo transaction', () => {
    const store = createEditorStore(createDocumentWithTiles());
    store.getState().setSelection(['tile-a']);

    expect(store.getState().beginTransaction('drag-tile-a')).toBe(true);
    expect(store.getState().moveSelectionBy({ x: 5, y: 0 }, { snap: false })).toBe(true);
    expect(store.getState().moveSelectionBy({ x: 5, y: 0 }, { snap: false })).toBe(true);
    expect(store.getState().commitTransaction('drag-tile-a')).toBe(true);
    expect(store.getState().history.past).toHaveLength(1);
    expect(store.getState().document.tiles[0]?.position.x).toBe(10);

    expect(store.getState().undo()).toBe(true);
    expect(store.getState().document.tiles[0]?.position.x).toBe(0);
    expect(store.getState().redo()).toBe(true);
    expect(store.getState().document.tiles[0]?.position.x).toBe(10);
  });

  it('cancels an in-progress transaction without adding history', () => {
    const store = createEditorStore(createDocumentWithTiles());
    store.getState().setSelection(['tile-a']);

    store.getState().beginTransaction('keyboard-nudge');
    store.getState().moveSelectionBy({ x: 20, y: 0 }, { snap: false });

    expect(store.getState().cancelTransaction('keyboard-nudge')).toBe(true);
    expect(store.getState().document.tiles[0]?.position.x).toBe(0);
    expect(store.getState().history.past).toHaveLength(0);
  });

  it('adds, targets, and safely removes levels', () => {
    const store = createEditorStore(createDocumentWithTiles());
    store.getState().setSelection(['tile-a', 'tile-b']);

    expect(
      store.getState().addLevel({
        id: 'level-1',
        name: 'Bridge',
        elevationMm: 250,
      }),
    ).toBe(true);
    expect(store.getState().moveSelectionToLevel('level-1')).toBe(true);
    expect(store.getState().setActiveLevel('level-1')).toBe(true);
    expect(store.getState().removeLevel('level-0')).toBe(true);

    expect(store.getState().document.levels.map(({ id }) => id)).toEqual(['level-1']);
    expect(store.getState().document.tiles.every(({ levelId }) => levelId === 'level-1')).toBe(
      true,
    );
    expect(store.getState().activeLevelId).toBe('level-1');
  });

  it('rotates selected track elements in quarter turns', () => {
    const store = createEditorStore(createDocumentWithTiles());
    store.getState().setSelection(['tile-a', 'tile-b']);

    expect(store.getState().rotateSelection()).toBe(true);
    expect(store.getState().document.tiles.map(({ rotation }) => rotation)).toEqual([1, 1]);
    expect(store.getState().rotateSelection('counterClockwise')).toBe(true);
    expect(store.getState().document.tiles.map(({ rotation }) => rotation)).toEqual([0, 0]);
  });
});
