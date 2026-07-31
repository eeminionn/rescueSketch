import { getCatalogItem, type CatalogItem, type SvgDescriptor } from '../catalog';
import {
  parseTrackDocument,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../domain';

type SvgPaint =
  | 'none'
  | 'tile'
  | 'line'
  | 'greenMarker'
  | 'redMarker'
  | 'silverTape'
  | 'structure'
  | 'hazard'
  | 'livingVictim'
  | 'deadVictim'
  | 'checkpoint';

const paintByName: Readonly<Record<SvgPaint, string>> = {
  none: 'none',
  tile: '#fbfaf4',
  line: '#142521',
  greenMarker: '#42a477',
  redMarker: '#d95043',
  silverTape: '#aeb8b6',
  structure: '#d8d8ce',
  hazard: '#ef8b58',
  livingVictim: '#d5b957',
  deadVictim: '#1b2522',
  checkpoint: '#5eb79a',
};

export interface TrackSvgOptions {
  backgroundColor?: string;
  includeGrid?: boolean;
  includeMetadata?: boolean;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function assertCssColor(value: string): string {
  if (!/^#[0-9a-f]{3,8}$/iu.test(value) && !/^rgba?\([\d\s.,%+-]+\)$/u.test(value)) {
    throw new RangeError('backgroundColor must be a simple hexadecimal or rgb() colour.');
  }

  return value;
}

function descriptorPrimitiveMarkup(primitive: SvgDescriptor['primitives'][number]): string {
  const fill = paintByName[primitive.fill];
  const stroke = paintByName[primitive.stroke];
  const strokeAttributes = `fill="${fill}" stroke="${stroke}" stroke-width="${primitive.strokeWidthMm}"`;

  if (primitive.type === 'path') {
    return `<path d="${escapeXml(primitive.d)}" ${strokeAttributes} stroke-linecap="${primitive.lineCap ?? 'butt'}" stroke-linejoin="${primitive.lineJoin ?? 'miter'}"/>`;
  }

  if (primitive.type === 'rect') {
    return `<rect x="${primitive.x}" y="${primitive.y}" width="${primitive.width}" height="${primitive.height}"${primitive.radius === undefined ? '' : ` rx="${primitive.radius}" ry="${primitive.radius}"`} ${strokeAttributes}/>`;
  }

  if (primitive.type === 'circle') {
    return `<circle cx="${primitive.centerX}" cy="${primitive.centerY}" r="${primitive.radius}" ${strokeAttributes}/>`;
  }

  const points = primitive.points.map(({ x, y }) => `${x},${y}`).join(' ');
  return `<polygon points="${points}" ${strokeAttributes}/>`;
}

function getItem(element: TrackTile | TrackStructure): CatalogItem | undefined {
  try {
    return getCatalogItem('catalogItemId' in element ? element.catalogItemId : element.kind);
  } catch {
    return undefined;
  }
}

function renderElement(element: TrackTile | TrackStructure): string {
  const item = getItem(element);

  if (item === undefined) {
    return '';
  }

  const { width, height } = item.svgDescriptor.viewBox;
  const rotation = element.rotation * 90;
  const transform = `translate(${element.position.x} ${element.position.y}) translate(${width / 2} ${height / 2}) rotate(${rotation}) translate(${-width / 2} ${-height / 2})`;
  const primitives = item.svgDescriptor.primitives.map(descriptorPrimitiveMarkup).join('');

  return `<g data-element-id="${escapeXml(element.id)}" data-catalog-item-id="${escapeXml(item.id)}" transform="${transform}">${primitives}</g>`;
}

export function renderTrackElementSvg(element: TrackTile | TrackStructure): string {
  const item = getItem(element);

  if (item === undefined) {
    throw new RangeError(`Unknown catalog element: ${element.id}`);
  }

  const { width, height } = item.svgDescriptor.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><g id="element">${renderElement({ ...element, position: { x: 0, y: 0 } })}</g></svg>`;
}

function renderGrid(widthMm: number, heightMm: number, tileSizeMm: number): string {
  const lines: string[] = [];

  for (let x = tileSizeMm; x < widthMm; x += tileSizeMm) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${heightMm}"/>`);
  }

  for (let y = tileSizeMm; y < heightMm; y += tileSizeMm) {
    lines.push(`<line x1="0" y1="${y}" x2="${widthMm}" y2="${y}"/>`);
  }

  return `<g id="grid" fill="none" stroke="#10231f" stroke-opacity="0.16" stroke-width="2">${lines.join('')}</g>`;
}

export function renderTrackSvg(
  inputDocument: TrackDocumentV1,
  options: TrackSvgOptions = {},
): string {
  const document = parseTrackDocument(inputDocument);
  const backgroundColor = assertCssColor(options.backgroundColor ?? '#fbfaf4');
  const metadata =
    options.includeMetadata === false
      ? ''
      : `<metadata>${escapeXml(
          JSON.stringify({
            application: 'RescueSketch',
            schemaVersion: document.schemaVersion,
            rulesetVersion: document.rulesetVersion,
            catalogVersion: document.catalogVersion,
          }),
        )}</metadata>`;
  const tileMarkup = document.tiles.map(renderElement).join('');
  const structureMarkup = document.structures.map(renderElement).join('');
  const gridMarkup =
    options.includeGrid === false
      ? ''
      : renderGrid(document.canvas.widthMm, document.canvas.heightMm, document.canvas.tileSizeMm);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${document.canvas.widthMm}mm" height="${document.canvas.heightMm}mm" viewBox="0 0 ${document.canvas.widthMm} ${document.canvas.heightMm}" role="img" aria-label="RescueSketch track ${document.canvas.widthMm} by ${document.canvas.heightMm} millimetres">${metadata}<g id="background"><rect width="100%" height="100%" fill="${backgroundColor}"/></g>${gridMarkup}<g id="tiles">${tileMarkup}</g><g id="structures">${structureMarkup}</g><g id="annotations"></g></svg>`;
}

export const createTrackSvg = renderTrackSvg;
