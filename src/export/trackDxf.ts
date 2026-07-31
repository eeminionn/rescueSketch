import { DxfWriter, Units, type CommonEntityOptions } from '@tarikjabiri/dxf';

import { getCatalogItem } from '../catalog';
import {
  parseTrackDocument,
  rotateSegment,
  type GeometrySegment,
  type Point,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../domain';
import { resolveCatalogGeometry } from '../fabrication/geometry';

export const dxfLayers = [
  'TILES',
  'LINE_CENTER',
  'LINE_EDGES',
  'HAZARDS',
  'STRUCTURE',
  'DIMENSIONS',
  'ANNOTATIONS',
] as const;

export interface TrackDxfResult {
  content: string;
  warnings: string[];
}

export interface TrackDxfOptions {
  resolveGeometry?: (element: TrackTile | TrackStructure) => readonly GeometrySegment[];
}

function point3d(point: Point) {
  return { x: point.x, y: point.y, z: 0 };
}

function descriptorCenter(element: TrackTile | TrackStructure): Point {
  try {
    const item = getCatalogItem('catalogItemId' in element ? element.catalogItemId : element.kind);
    return { x: item.svgDescriptor.viewBox.width / 2, y: item.svgDescriptor.viewBox.height / 2 };
  } catch {
    return { x: 150, y: 150 };
  }
}

function translateSegment(
  segment: GeometrySegment,
  element: TrackTile | TrackStructure,
): GeometrySegment {
  const rotated = rotateSegment(segment, element.rotation, descriptorCenter(element));
  const translate = (point: Point): Point => ({
    x: point.x + element.position.x,
    y: point.y + element.position.y,
  });
  return rotated.kind === 'line'
    ? { ...rotated, start: translate(rotated.start), end: translate(rotated.end) }
    : { ...rotated, center: translate(rotated.center) };
}

function entityOptions(layerName: string): CommonEntityOptions {
  return { layerName };
}

function addSegment(writer: DxfWriter, segment: GeometrySegment, layerName: string): void {
  if (segment.kind === 'line') {
    writer.addLine(point3d(segment.start), point3d(segment.end), entityOptions(layerName));
    return;
  }

  const startAngle = segment.startAngleDeg;
  const endAngle = segment.endAngleDeg;
  if (segment.clockwise) {
    writer.addArc(
      point3d(segment.center),
      segment.radius,
      endAngle,
      startAngle,
      entityOptions(layerName),
    );
  } else {
    writer.addArc(
      point3d(segment.center),
      segment.radius,
      startAngle,
      endAngle,
      entityOptions(layerName),
    );
  }
}

function addRectangle(
  writer: DxfWriter,
  x: number,
  y: number,
  width: number,
  height: number,
  layerName: string,
): void {
  writer.addRectangle({ x, y: y + height }, { x: x + width, y }, entityOptions(layerName));
}

function addElementGeometry(
  writer: DxfWriter,
  element: TrackTile | TrackStructure,
  geometry: readonly GeometrySegment[],
  layerName: string,
): void {
  for (const segment of geometry) addSegment(writer, translateSegment(segment, element), layerName);
}

function addTileFootprint(
  writer: DxfWriter,
  element: TrackTile | TrackStructure,
  layerName: string,
): void {
  try {
    const item = getCatalogItem('catalogItemId' in element ? element.catalogItemId : element.kind);
    const width = item.svgDescriptor.viewBox.width;
    const height = item.svgDescriptor.viewBox.height;
    addRectangle(writer, element.position.x, element.position.y, width, height, layerName);
  } catch {
    addRectangle(writer, element.position.x, element.position.y, 300, 300, layerName);
  }
}

export function exportTrackDxfResult(
  inputDocument: TrackDocumentV1,
  options: TrackDxfOptions = {},
): TrackDxfResult {
  const document = parseTrackDocument(inputDocument);
  const writer = new DxfWriter();
  writer.setUnits(Units.Millimeters);
  writer.setVariable('$ACADVER', { 1: 'AC1015' });
  writer.setVariable('$INSUNITS', { 70: 4 });
  writer.setVariable('$MEASUREMENT', { 70: 1 });
  for (const [index, layer] of dxfLayers.entries()) writer.addLayer(layer, index + 1, 'CONTINUOUS');

  const warnings: string[] = [];
  const elements: Array<{ element: TrackTile | TrackStructure; layer: string }> = [
    ...document.tiles.map((element) => ({ element, layer: 'TILES' })),
    ...document.structures.map((element) => ({
      element,
      layer: ['speedBump', 'debris', 'obstacle'].includes(element.kind) ? 'HAZARDS' : 'STRUCTURE',
    })),
  ].sort((left, right) => left.element.id.localeCompare(right.element.id));

  for (const { element, layer } of elements) {
    addTileFootprint(writer, element, layer);
    let geometry: readonly GeometrySegment[];
    try {
      geometry =
        options.resolveGeometry?.(element) ??
        resolveCatalogGeometry(
          'catalogItemId' in element ? element.catalogItemId : element.kind,
          element.parameters,
        );
    } catch {
      geometry = element.geometry;
      warnings.push(`Geometry fallback used for ${element.id}; persisted geometry was exported.`);
    }
    if (geometry.length > 0)
      addElementGeometry(writer, element, geometry, layer === 'TILES' ? 'LINE_CENTER' : layer);
  }

  for (const annotation of document.annotations) {
    writer.addPoint(annotation.position.x, annotation.position.y, 0, entityOptions('ANNOTATIONS'));
  }

  return { content: writer.document.stringify(), warnings };
}

export function exportTrackDxf(
  inputDocument: TrackDocumentV1,
  options: TrackDxfOptions = {},
): string {
  return exportTrackDxfResult(inputDocument, options).content;
}

export const createTrackDxf = exportTrackDxf;
