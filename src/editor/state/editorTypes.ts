import type { Point, TrackDocumentV1, TrackLevel, TrackStructure, TrackTile } from '../../domain';

export const defaultHistoryLimit = 100;

export type SelectionMode = 'replace' | 'add' | 'toggle';
export type RotationDirection = 'clockwise' | 'counterClockwise';

export interface EditorSnapshot {
  document: TrackDocumentV1;
  selectionIds: readonly string[];
  activeLevelId: string;
}

export interface EditorHistory {
  past: readonly EditorSnapshot[];
  future: readonly EditorSnapshot[];
  limit: number;
}

export interface EditorTransaction {
  id: string;
  before: EditorSnapshot;
}

export interface EditorStoreOptions {
  historyLimit?: number;
  activeLevelId?: string;
}

export interface PlacementOptions {
  select?: boolean;
  snap?: boolean;
}

export interface MoveOptions {
  snap?: boolean;
}

export interface DuplicateOptions extends MoveOptions {
  offsetMm?: Point;
}

export interface InsertTileInput {
  id: string;
  catalogItemId: string;
  position: Point;
  levelId?: string;
  rotation?: TrackTile['rotation'];
  geometry?: TrackTile['geometry'];
  parameters?: TrackTile['parameters'];
}

export interface InsertStructureInput {
  id: string;
  kind: TrackStructure['kind'];
  position: Point;
  levelId?: string;
  rotation?: TrackStructure['rotation'];
  geometry?: TrackStructure['geometry'];
  parameters?: TrackStructure['parameters'];
}

export interface EditorState {
  document: TrackDocumentV1;
  selectionIds: readonly string[];
  activeLevelId: string;
  history: EditorHistory;
  transaction: EditorTransaction | null;
  revision: number;
  setSelection: (ids: readonly string[], mode?: SelectionMode) => void;
  clearSelection: () => void;
  insertTile: (input: InsertTileInput, options?: PlacementOptions) => boolean;
  insertStructure: (input: InsertStructureInput, options?: PlacementOptions) => boolean;
  moveSelectionBy: (deltaMm: Point, options?: MoveOptions) => boolean;
  moveElementTo: (elementId: string, positionMm: Point, options?: MoveOptions) => boolean;
  duplicateSelection: (options?: DuplicateOptions) => readonly string[];
  deleteSelection: () => boolean;
  clearAllElements: () => boolean;
  rotateSelection: (direction?: RotationDirection) => boolean;
  addLevel: (level: TrackLevel) => boolean;
  removeLevel: (levelId: string, destinationLevelId?: string) => boolean;
  moveSelectionToLevel: (levelId: string) => boolean;
  setActiveLevel: (levelId: string) => boolean;
  beginTransaction: (transactionId: string) => boolean;
  commitTransaction: (transactionId?: string) => boolean;
  cancelTransaction: (transactionId?: string) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  replaceDocument: (document: TrackDocumentV1, clearHistory?: boolean) => void;
}
