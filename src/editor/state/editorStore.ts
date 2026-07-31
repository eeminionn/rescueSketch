import { createStore, type StoreApi } from 'zustand/vanilla';

import {
  parseTrackDocument,
  roundGeometryValue,
  serializeTrackDocument,
  snapPoint,
  type Point,
  type TrackDocumentV1,
} from '../../domain';
import {
  deleteDocumentElements,
  duplicateDocumentElements,
  expandCanvasToFit,
  getDocumentElementIds,
  hasDocumentElement,
  moveDocumentElements,
  rotateDocumentElements,
  sortIds,
} from './documentOperations';
import {
  defaultHistoryLimit,
  type EditorSnapshot,
  type EditorState,
  type EditorStoreOptions,
  type InsertStructureInput,
  type InsertTileInput,
  type PlacementOptions,
  type RotationDirection,
  type SelectionMode,
} from './editorTypes';

export type EditorStore = StoreApi<EditorState>;

function createSnapshot(state: EditorState): EditorSnapshot {
  return {
    document: state.document,
    selectionIds: state.selectionIds,
    activeLevelId: state.activeLevelId,
  };
}

function documentEquals(left: TrackDocumentV1, right: TrackDocumentV1): boolean {
  return left === right || serializeTrackDocument(left) === serializeTrackDocument(right);
}

function trimHistory(
  snapshots: readonly EditorSnapshot[],
  limit: number,
): readonly EditorSnapshot[] {
  return snapshots.length <= limit ? snapshots : snapshots.slice(snapshots.length - limit);
}

function resolveHistoryLimit(value: number | undefined): number {
  const limit = value ?? defaultHistoryLimit;

  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new RangeError('historyLimit must be an integer from 1 to 1000.');
  }

  return limit;
}

function filterSelection(document: TrackDocumentV1, ids: readonly string[]): readonly string[] {
  const elementIds = new Set(getDocumentElementIds(document));
  return sortIds(ids.filter((id) => elementIds.has(id)));
}

function resolveSelection(
  document: TrackDocumentV1,
  currentSelection: readonly string[],
  ids: readonly string[],
  mode: SelectionMode,
): readonly string[] {
  const validIds = filterSelection(document, ids);

  if (mode === 'replace') {
    return validIds;
  }

  const nextSelection = new Set(currentSelection);

  for (const id of validIds) {
    if (mode === 'toggle' && nextSelection.has(id)) {
      nextSelection.delete(id);
    } else {
      nextSelection.add(id);
    }
  }

  return sortIds(nextSelection);
}

function getElementPosition(document: TrackDocumentV1, elementId: string): Point | undefined {
  return [...document.tiles, ...document.structures, ...document.annotations].find(
    ({ id }) => id === elementId,
  )?.position;
}

function getFirstLevelId(document: TrackDocumentV1): string {
  const firstLevel = document.levels[0];

  if (firstLevel === undefined) {
    throw new RangeError('TrackDocumentV1 requires at least one level.');
  }

  return firstLevel.id;
}

function getPlacementPosition(position: Point, gridSizeMm: number, shouldSnap: boolean): Point {
  const normalized = shouldSnap ? snapPoint(position, gridSizeMm) : position;

  return {
    x: roundGeometryValue(Math.max(0, normalized.x)),
    y: roundGeometryValue(Math.max(0, normalized.y)),
  };
}

export function createEditorStore(
  initialDocument: TrackDocumentV1,
  options: EditorStoreOptions = {},
): EditorStore {
  const document = parseTrackDocument(initialDocument);
  const historyLimit = resolveHistoryLimit(options.historyLimit);
  const requestedLevelId = options.activeLevelId;
  const activeLevelId =
    requestedLevelId !== undefined && document.levels.some(({ id }) => id === requestedLevelId)
      ? requestedLevelId
      : getFirstLevelId(document);

  return createStore<EditorState>()((set, get) => {
    const applyDocument = (
      nextDocumentValue: TrackDocumentV1,
      nextSelectionValue?: readonly string[],
    ): boolean => {
      const state = get();
      const nextDocument = parseTrackDocument(nextDocumentValue);
      const nextSelection = filterSelection(nextDocument, nextSelectionValue ?? state.selectionIds);

      if (documentEquals(state.document, nextDocument)) {
        if (nextSelection !== state.selectionIds) {
          set({ selectionIds: nextSelection });
        }
        return false;
      }

      if (state.transaction !== null) {
        set({
          document: nextDocument,
          selectionIds: nextSelection,
          revision: state.revision + 1,
        });
        return true;
      }

      set({
        document: nextDocument,
        selectionIds: nextSelection,
        history: {
          ...state.history,
          past: trimHistory([...state.history.past, createSnapshot(state)], state.history.limit),
          future: [],
        },
        revision: state.revision + 1,
      });
      return true;
    };

    const isExpectedTransaction = (transactionId: string | undefined): boolean => {
      const transaction = get().transaction;
      return (
        transaction !== null && (transactionId === undefined || transaction.id === transactionId)
      );
    };

    return {
      document,
      selectionIds: [],
      activeLevelId,
      history: {
        past: [],
        future: [],
        limit: historyLimit,
      },
      transaction: null,
      revision: 0,
      setSelection: (ids, mode = 'replace') => {
        const state = get();
        set({
          selectionIds: resolveSelection(state.document, state.selectionIds, ids, mode),
        });
      },
      clearSelection: () => {
        if (get().selectionIds.length > 0) {
          set({ selectionIds: [] });
        }
      },
      insertTile: (input: InsertTileInput, placementOptions: PlacementOptions = {}) => {
        const state = get();

        if (hasDocumentElement(state.document, input.id)) {
          return false;
        }

        const levelId = input.levelId ?? state.activeLevelId;

        if (!state.document.levels.some(({ id }) => id === levelId)) {
          return false;
        }

        const position = getPlacementPosition(
          input.position,
          state.document.canvas.gridSizeMm,
          placementOptions.snap ?? true,
        );
        const nextDocument = expandCanvasToFit({
          ...state.document,
          tiles: [
            ...state.document.tiles,
            {
              id: input.id,
              catalogItemId: input.catalogItemId,
              levelId,
              position,
              rotation: input.rotation ?? 0,
              geometry: input.geometry ?? [],
              parameters: input.parameters ?? {},
            },
          ],
        });

        return applyDocument(
          nextDocument,
          placementOptions.select === false ? state.selectionIds : [input.id],
        );
      },
      insertStructure: (input: InsertStructureInput, placementOptions: PlacementOptions = {}) => {
        const state = get();

        if (hasDocumentElement(state.document, input.id)) {
          return false;
        }

        const levelId = input.levelId ?? state.activeLevelId;

        if (!state.document.levels.some(({ id }) => id === levelId)) {
          return false;
        }

        const nextDocument = expandCanvasToFit({
          ...state.document,
          structures: [
            ...state.document.structures,
            {
              id: input.id,
              kind: input.kind,
              levelId,
              position: getPlacementPosition(
                input.position,
                state.document.canvas.gridSizeMm,
                placementOptions.snap ?? true,
              ),
              rotation: input.rotation ?? 0,
              geometry: input.geometry ?? [],
              parameters: input.parameters ?? {},
            },
          ],
        });

        return applyDocument(
          nextDocument,
          placementOptions.select === false ? state.selectionIds : [input.id],
        );
      },
      moveSelectionBy: (deltaMm, moveOptions = {}) => {
        const state = get();
        return applyDocument(
          moveDocumentElements(state.document, new Set(state.selectionIds), deltaMm, moveOptions),
        );
      },
      moveElementTo: (elementId, positionMm, moveOptions = {}) => {
        const state = get();
        const currentPosition = getElementPosition(state.document, elementId);

        if (currentPosition === undefined) {
          return false;
        }

        return applyDocument(
          moveDocumentElements(
            state.document,
            new Set([elementId]),
            {
              x: positionMm.x - currentPosition.x,
              y: positionMm.y - currentPosition.y,
            },
            moveOptions,
          ),
        );
      },
      duplicateSelection: (duplicateOptions = {}) => {
        const state = get();
        const result = duplicateDocumentElements(
          state.document,
          new Set(state.selectionIds),
          duplicateOptions,
        );

        return applyDocument(result.document, result.duplicatedIds) ? result.duplicatedIds : [];
      },
      deleteSelection: () => {
        const state = get();
        return applyDocument(
          deleteDocumentElements(state.document, new Set(state.selectionIds)),
          [],
        );
      },
      clearAllElements: () => {
        const state = get();
        const hasElements =
          state.document.tiles.length > 0 ||
          state.document.structures.length > 0 ||
          state.document.annotations.length > 0;
        if (!hasElements) return false;
        return applyDocument({ ...state.document, tiles: [], structures: [], annotations: [] }, []);
      },
      rotateSelection: (direction: RotationDirection = 'clockwise') => {
        const state = get();
        return applyDocument(
          rotateDocumentElements(state.document, new Set(state.selectionIds), direction),
        );
      },
      addLevel: (level) => {
        const state = get();

        if (state.document.levels.some(({ id }) => id === level.id)) {
          return false;
        }

        return applyDocument({
          ...state.document,
          levels: [...state.document.levels, level],
        });
      },
      removeLevel: (levelId, destinationLevelId) => {
        const state = get();

        if (state.document.levels.length === 1) {
          return false;
        }

        const levelExists = state.document.levels.some(({ id }) => id === levelId);
        const hasElements = [...state.document.tiles, ...state.document.structures].some(
          (element) => element.levelId === levelId,
        );

        if (
          !levelExists ||
          destinationLevelId === levelId ||
          (hasElements && destinationLevelId === undefined) ||
          (destinationLevelId !== undefined &&
            !state.document.levels.some(({ id }) => id === destinationLevelId))
        ) {
          return false;
        }

        const reassign = <T extends { levelId: string }>(element: T): T =>
          element.levelId === levelId && destinationLevelId !== undefined
            ? { ...element, levelId: destinationLevelId }
            : element;
        const nextActiveLevelId =
          state.activeLevelId === levelId
            ? (destinationLevelId ??
              state.document.levels.find(({ id }) => id !== levelId)?.id ??
              state.activeLevelId)
            : state.activeLevelId;
        const changed = applyDocument({
          ...state.document,
          levels: state.document.levels.filter(({ id }) => id !== levelId),
          tiles: state.document.tiles.map(reassign),
          structures: state.document.structures.map(reassign),
        });

        if (changed) {
          set({ activeLevelId: nextActiveLevelId });
        }

        return changed;
      },
      moveSelectionToLevel: (levelId) => {
        const state = get();

        if (!state.document.levels.some(({ id }) => id === levelId)) {
          return false;
        }

        const selectedIds = new Set(state.selectionIds);
        const move = <T extends { id: string; levelId: string }>(element: T): T =>
          selectedIds.has(element.id) ? { ...element, levelId } : element;

        return applyDocument({
          ...state.document,
          tiles: state.document.tiles.map(move),
          structures: state.document.structures.map(move),
        });
      },
      setActiveLevel: (levelId) => {
        if (!get().document.levels.some(({ id }) => id === levelId)) {
          return false;
        }

        set({ activeLevelId: levelId });
        return true;
      },
      beginTransaction: (transactionId) => {
        const state = get();

        if (
          state.transaction !== null ||
          transactionId.trim().length === 0 ||
          transactionId.length > 128
        ) {
          return false;
        }

        set({
          transaction: {
            id: transactionId,
            before: createSnapshot(state),
          },
        });
        return true;
      },
      commitTransaction: (transactionId) => {
        if (!isExpectedTransaction(transactionId)) {
          return false;
        }

        const state = get();
        const transaction = state.transaction;

        if (transaction === null) {
          return false;
        }

        const changed = !documentEquals(transaction.before.document, state.document);

        set({
          transaction: null,
          ...(changed
            ? {
                history: {
                  ...state.history,
                  past: trimHistory(
                    [...state.history.past, transaction.before],
                    state.history.limit,
                  ),
                  future: [],
                },
              }
            : {}),
        });
        return changed;
      },
      cancelTransaction: (transactionId) => {
        if (!isExpectedTransaction(transactionId)) {
          return false;
        }

        const state = get();
        const transaction = state.transaction;

        if (transaction === null) {
          return false;
        }

        const changed = !documentEquals(transaction.before.document, state.document);

        set({
          ...transaction.before,
          transaction: null,
          revision: changed ? state.revision + 1 : state.revision,
        });
        return changed;
      },
      undo: () => {
        const state = get();

        if (state.transaction !== null || state.history.past.length === 0) {
          return false;
        }

        const previous = state.history.past.at(-1);

        if (previous === undefined) {
          return false;
        }

        set({
          ...previous,
          history: {
            ...state.history,
            past: state.history.past.slice(0, -1),
            future: trimHistory(
              [...state.history.future, createSnapshot(state)],
              state.history.limit,
            ),
          },
          revision: state.revision + 1,
        });
        return true;
      },
      redo: () => {
        const state = get();

        if (state.transaction !== null || state.history.future.length === 0) {
          return false;
        }

        const next = state.history.future.at(-1);

        if (next === undefined) {
          return false;
        }

        set({
          ...next,
          history: {
            ...state.history,
            past: trimHistory([...state.history.past, createSnapshot(state)], state.history.limit),
            future: state.history.future.slice(0, -1),
          },
          revision: state.revision + 1,
        });
        return true;
      },
      replaceDocument: (nextDocumentValue, clearHistory = true) => {
        const nextDocument = parseTrackDocument(nextDocumentValue);
        const state = get();
        const nextActiveLevelId = nextDocument.levels.some(({ id }) => id === state.activeLevelId)
          ? state.activeLevelId
          : getFirstLevelId(nextDocument);

        if (clearHistory) {
          set({
            document: nextDocument,
            selectionIds: [],
            activeLevelId: nextActiveLevelId,
            history: {
              ...state.history,
              past: [],
              future: [],
            },
            transaction: null,
            revision: state.revision + 1,
          });
          return;
        }

        applyDocument(nextDocument, []);
      },
    };
  });
}
