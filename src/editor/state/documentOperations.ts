import {
  parseTrackDocument,
  roundGeometryValue,
  snapPoint,
  tileSizeMm,
  type GeometrySegment,
  type Point,
  type TrackAnnotation,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../../domain';
import type { DuplicateOptions, MoveOptions, RotationDirection } from './editorTypes';

const maxCanvasSizeMm = 30_000;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(compareCodeUnits);
}

export function getDocumentElementIds(document: TrackDocumentV1): string[] {
  return sortIds([
    ...document.tiles.map(({ id }) => id),
    ...document.structures.map(({ id }) => id),
    ...document.annotations.map(({ id }) => id),
  ]);
}

export function hasDocumentElement(document: TrackDocumentV1, elementId: string): boolean {
  return getDocumentElementIds(document).includes(elementId);
}

function normalizePosition(point: Point, gridSizeMm: number, shouldSnap: boolean): Point {
  const normalized = shouldSnap ? snapPoint(point, gridSizeMm) : point;

  return {
    x: roundGeometryValue(Math.max(0, normalized.x)),
    y: roundGeometryValue(Math.max(0, normalized.y)),
  };
}

function getSegmentMaximum(segment: GeometrySegment): Point {
  if (segment.kind === 'line') {
    return {
      x: Math.max(segment.start.x, segment.end.x),
      y: Math.max(segment.start.y, segment.end.y),
    };
  }

  return {
    x: segment.center.x + segment.radius,
    y: segment.center.y + segment.radius,
  };
}

function getStructureSize(structure: TrackStructure): Point {
  const maxima = structure.geometry.map(getSegmentMaximum);

  return {
    x: Math.max(tileSizeMm, ...maxima.map(({ x }) => x)),
    y: Math.max(tileSizeMm, ...maxima.map(({ y }) => y)),
  };
}

export function expandCanvasToFit(document: TrackDocumentV1): TrackDocumentV1 {
  let requiredWidthMm = document.canvas.widthMm;
  let requiredHeightMm = document.canvas.heightMm;

  for (const tile of document.tiles) {
    requiredWidthMm = Math.max(requiredWidthMm, tile.position.x + tileSizeMm);
    requiredHeightMm = Math.max(requiredHeightMm, tile.position.y + tileSizeMm);
  }

  for (const structure of document.structures) {
    const size = getStructureSize(structure);
    requiredWidthMm = Math.max(requiredWidthMm, structure.position.x + size.x);
    requiredHeightMm = Math.max(requiredHeightMm, structure.position.y + size.y);
  }

  for (const annotation of document.annotations) {
    requiredWidthMm = Math.max(requiredWidthMm, annotation.position.x);
    requiredHeightMm = Math.max(requiredHeightMm, annotation.position.y);
  }

  const widthMm = Math.ceil(requiredWidthMm / tileSizeMm) * tileSizeMm;
  const heightMm = Math.ceil(requiredHeightMm / tileSizeMm) * tileSizeMm;

  if (widthMm > maxCanvasSizeMm || heightMm > maxCanvasSizeMm) {
    throw new RangeError(`Canvas cannot exceed ${maxCanvasSizeMm} mm on either axis.`);
  }

  if (widthMm === document.canvas.widthMm && heightMm === document.canvas.heightMm) {
    return document;
  }

  return {
    ...document,
    canvas: {
      ...document.canvas,
      widthMm,
      heightMm,
    },
  };
}

function getSelectedPositions(
  document: TrackDocumentV1,
  selectedIds: ReadonlySet<string>,
): Point[] {
  return [...document.tiles, ...document.structures, ...document.annotations]
    .filter(({ id }) => selectedIds.has(id))
    .map(({ position }) => position);
}

export function moveDocumentElements(
  document: TrackDocumentV1,
  selectedIds: ReadonlySet<string>,
  deltaMm: Point,
  options: MoveOptions = {},
): TrackDocumentV1 {
  if (!Number.isFinite(deltaMm.x) || !Number.isFinite(deltaMm.y)) {
    throw new RangeError('Movement delta must use finite millimetre values.');
  }

  const selectedPositions = getSelectedPositions(document, selectedIds);

  if (selectedPositions.length === 0 || (deltaMm.x === 0 && deltaMm.y === 0)) {
    return document;
  }

  const minimumX = Math.min(...selectedPositions.map(({ x }) => x + deltaMm.x));
  const minimumY = Math.min(...selectedPositions.map(({ y }) => y + deltaMm.y));
  const adjustedDelta = {
    x: roundGeometryValue(deltaMm.x + Math.max(0, -minimumX)),
    y: roundGeometryValue(deltaMm.y + Math.max(0, -minimumY)),
  };
  const shouldSnap = options.snap ?? true;
  const move = <T extends TrackTile | TrackStructure | TrackAnnotation>(element: T): T =>
    selectedIds.has(element.id)
      ? {
          ...element,
          position: normalizePosition(
            {
              x: element.position.x + adjustedDelta.x,
              y: element.position.y + adjustedDelta.y,
            },
            document.canvas.gridSizeMm,
            shouldSnap,
          ),
        }
      : element;

  return parseTrackDocument(
    expandCanvasToFit({
      ...document,
      tiles: document.tiles.map(move),
      structures: document.structures.map(move),
      annotations: document.annotations.map(move),
    }),
  );
}

function createCopyId(sourceId: string, reservedIds: Set<string>): string {
  let candidate = `${sourceId}-copy`;
  let suffix = 2;

  while (reservedIds.has(candidate)) {
    candidate = `${sourceId}-copy-${suffix}`;
    suffix += 1;
  }

  reservedIds.add(candidate);
  return candidate;
}

export interface DuplicateResult {
  document: TrackDocumentV1;
  duplicatedIds: readonly string[];
}

export function duplicateDocumentElements(
  document: TrackDocumentV1,
  selectedIds: ReadonlySet<string>,
  options: DuplicateOptions = {},
): DuplicateResult {
  const reservedIds = new Set(getDocumentElementIds(document));
  const copyIds = new Map<string, string>();

  for (const id of sortIds(selectedIds)) {
    if (reservedIds.has(id)) {
      copyIds.set(id, createCopyId(id, reservedIds));
    }
  }

  if (copyIds.size === 0) {
    return { document, duplicatedIds: [] };
  }

  const offsetMm = options.offsetMm ?? {
    x: document.canvas.gridSizeMm,
    y: document.canvas.gridSizeMm,
  };
  const shouldSnap = options.snap ?? true;
  const copyPosition = (position: Point) =>
    normalizePosition(
      {
        x: position.x + offsetMm.x,
        y: position.y + offsetMm.y,
      },
      document.canvas.gridSizeMm,
      shouldSnap,
    );

  const copiedTiles = document.tiles
    .filter(({ id }) => copyIds.has(id))
    .map((tile) => ({
      ...tile,
      id: copyIds.get(tile.id) ?? tile.id,
      position: copyPosition(tile.position),
    }));
  const copiedStructures = document.structures
    .filter(({ id }) => copyIds.has(id))
    .map((structure) => ({
      ...structure,
      id: copyIds.get(structure.id) ?? structure.id,
      position: copyPosition(structure.position),
    }));
  const copiedAnnotations = document.annotations
    .filter(({ id }) => copyIds.has(id))
    .map((annotation) => ({
      ...annotation,
      id: copyIds.get(annotation.id) ?? annotation.id,
      position: copyPosition(annotation.position),
      ...(annotation.elementId === undefined
        ? {}
        : { elementId: copyIds.get(annotation.elementId) ?? annotation.elementId }),
    }));

  const duplicatedIds = sortIds(copyIds.values());
  const nextDocument = parseTrackDocument(
    expandCanvasToFit({
      ...document,
      tiles: [...document.tiles, ...copiedTiles],
      structures: [...document.structures, ...copiedStructures],
      annotations: [...document.annotations, ...copiedAnnotations],
    }),
  );

  return {
    document: nextDocument,
    duplicatedIds,
  };
}

export function deleteDocumentElements(
  document: TrackDocumentV1,
  selectedIds: ReadonlySet<string>,
): TrackDocumentV1 {
  const deletedElementIds = new Set(
    [...document.tiles, ...document.structures]
      .filter(({ id }) => selectedIds.has(id))
      .map(({ id }) => id),
  );

  return parseTrackDocument({
    ...document,
    tiles: document.tiles.filter(({ id }) => !selectedIds.has(id)),
    structures: document.structures.filter(({ id }) => !selectedIds.has(id)),
    annotations: document.annotations.filter(
      ({ id, elementId }) =>
        !selectedIds.has(id) && (elementId === undefined || !deletedElementIds.has(elementId)),
    ),
  });
}

export function rotateDocumentElements(
  document: TrackDocumentV1,
  selectedIds: ReadonlySet<string>,
  direction: RotationDirection,
): TrackDocumentV1 {
  const offset = direction === 'clockwise' ? 1 : 3;
  const rotate = <T extends TrackTile | TrackStructure>(element: T): T =>
    selectedIds.has(element.id)
      ? {
          ...element,
          rotation: ((element.rotation + offset) % 4) as T['rotation'],
        }
      : element;

  return parseTrackDocument({
    ...document,
    tiles: document.tiles.map(rotate),
    structures: document.structures.map(rotate),
  });
}
