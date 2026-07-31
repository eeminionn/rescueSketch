import { getCatalogItem, type CatalogItem } from '../../catalog';
import { roundGeometryValue, type GeometrySegment, type Point } from '../../domain';

export type CatalogGeometryParameters = Readonly<
  Record<string, number | string | boolean | undefined>
>;

const catalogItemsWithoutRouteGeometry = new Set([
  'checkpoint',
  'deadSafePoint',
  'deadVictim',
  'evacuationZone',
  'livingSafePoint',
  'livingVictim',
  'pillar',
]);

function getEffectiveParameter(
  catalogItem: CatalogItem,
  parameterId: string,
  parameters: CatalogGeometryParameters,
): number {
  const parameter = [
    ...catalogItem.parameters.normative,
    ...catalogItem.parameters.constructionParameter,
  ].find(({ id }) => id === parameterId);

  if (parameter === undefined) {
    throw new Error(`Catalog item "${catalogItem.id}" does not define parameter "${parameterId}".`);
  }

  const override = parameters[parameterId];
  return typeof override === 'number' && Number.isFinite(override)
    ? override
    : parameter.defaultValue;
}

function getViewBoxDimensions(catalogItem: CatalogItem): {
  widthMm: number;
  heightMm: number;
} {
  return {
    widthMm: catalogItem.svgDescriptor.viewBox.width,
    heightMm: catalogItem.svgDescriptor.viewBox.height,
  };
}

function getTileDimensions(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): {
  widthMm: number;
  heightMm: number;
} {
  const widthMm = getEffectiveParameter(catalogItem, 'tileWidthMm', parameters);
  const heightMm = getEffectiveParameter(catalogItem, 'tileHeightMm', parameters);

  requirePositive('tileWidthMm', widthMm);
  requirePositive('tileHeightMm', heightMm);

  return { widthMm, heightMm };
}

function requirePositive(parameterId: string, value: number): void {
  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    !Number.isFinite(roundGeometryValue(value)) ||
    roundGeometryValue(value) <= 0
  ) {
    throw new RangeError(`${parameterId} must be a positive finite millimetre value.`);
  }
}

function requireNonNegative(parameterId: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || !Number.isFinite(roundGeometryValue(value))) {
    throw new RangeError(`${parameterId} must be a non-negative finite millimetre value.`);
  }
}

function requireContainedLength(parameterId: string, value: number, availableMm: number): void {
  requireNonNegative(parameterId, value);

  if (value > availableMm) {
    throw new RangeError(
      `${parameterId} (${value} mm) cannot exceed the available ${availableMm} mm.`,
    );
  }
}

function requireCoordinate(
  parameterId: string,
  value: number,
  minimumMm: number,
  maximumMm: number,
): void {
  if (!Number.isFinite(value) || value < minimumMm || value > maximumMm) {
    throw new RangeError(`${parameterId} must be between ${minimumMm} mm and ${maximumMm} mm.`);
  }
}

function line(start: Point, end: Point): GeometrySegment {
  const normalizedStart = {
    x: roundGeometryValue(start.x),
    y: roundGeometryValue(start.y),
  };
  const normalizedEnd = {
    x: roundGeometryValue(end.x),
    y: roundGeometryValue(end.y),
  };

  if (
    !Number.isFinite(normalizedStart.x) ||
    !Number.isFinite(normalizedStart.y) ||
    !Number.isFinite(normalizedEnd.x) ||
    !Number.isFinite(normalizedEnd.y)
  ) {
    throw new RangeError('Route line coordinates must remain finite at geometry precision.');
  }

  if (normalizedStart.x === normalizedEnd.x && normalizedStart.y === normalizedEnd.y) {
    throw new RangeError('A route line segment must have a non-zero length.');
  }

  return {
    kind: 'line',
    start: normalizedStart,
    end: normalizedEnd,
  };
}

function horizontalLine(startX: number, endX: number, y: number): GeometrySegment[] {
  return startX === endX ? [] : [line({ x: startX, y }, { x: endX, y })];
}

function resolveStraightLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const lineOffsetMm = getEffectiveParameter(catalogItem, 'lineOffsetMm', parameters);
  requireCoordinate('lineOffsetMm', lineOffsetMm, 0, heightMm);

  return horizontalLine(0, widthMm, lineOffsetMm);
}

function resolveCircularCurve(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const curveRadiusMm = getEffectiveParameter(catalogItem, 'curveRadiusMm', parameters);
  requirePositive('curveRadiusMm', curveRadiusMm);

  if (curveRadiusMm > Math.min(widthMm, heightMm)) {
    throw new RangeError(
      `curveRadiusMm (${curveRadiusMm} mm) does not fit inside the ${widthMm} × ${heightMm} mm tile.`,
    );
  }

  return [
    {
      kind: 'circularArc',
      center: { x: 0, y: roundGeometryValue(heightMm) },
      radius: roundGeometryValue(curveRadiusMm),
      startAngleDeg: 270,
      endAngleDeg: 0,
      clockwise: false,
    },
  ];
}

function resolveGapLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const gapLengthMm = getEffectiveParameter(catalogItem, 'gapLengthMm', parameters);
  const gapCenterMm = getEffectiveParameter(catalogItem, 'gapCenterMm', parameters);
  requireContainedLength('gapLengthMm', gapLengthMm, widthMm);
  requireCoordinate('gapCenterMm', gapCenterMm, 0, widthMm);

  const gapStartMm = gapCenterMm - gapLengthMm / 2;
  const gapEndMm = gapCenterMm + gapLengthMm / 2;

  if (gapStartMm < 0 || gapEndMm > widthMm) {
    throw new RangeError(
      `The ${gapLengthMm} mm gap centred at ${gapCenterMm} mm does not fit inside the ${widthMm} mm tile.`,
    );
  }

  const centerY = heightMm / 2;

  if (gapLengthMm === 0) {
    return horizontalLine(0, widthMm, centerY);
  }

  return [...horizontalLine(0, gapStartMm, centerY), ...horizontalLine(gapEndMm, widthMm, centerY)];
}

function resolveDiagonalLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const edgeInsetMm = getEffectiveParameter(catalogItem, 'edgeInsetMm', parameters);
  requireNonNegative('edgeInsetMm', edgeInsetMm);

  if (edgeInsetMm >= Math.min(widthMm, heightMm)) {
    throw new RangeError(`edgeInsetMm (${edgeInsetMm} mm) must remain below both tile dimensions.`);
  }

  return [line({ x: 0, y: heightMm / 2 }, { x: widthMm - edgeInsetMm, y: edgeInsetMm })];
}

function resolveWavyLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const amplitudeMm = getEffectiveParameter(catalogItem, 'amplitudeMm', parameters);
  const waveLengthMm = getEffectiveParameter(catalogItem, 'waveLengthMm', parameters);
  requireNonNegative('amplitudeMm', amplitudeMm);
  requirePositive('waveLengthMm', waveLengthMm);

  if (amplitudeMm > heightMm / 2) {
    throw new RangeError(
      `amplitudeMm (${amplitudeMm} mm) cannot exceed half the ${heightMm} mm tile height.`,
    );
  }

  const waveCount = widthMm / waveLengthMm;

  if (!Number.isFinite(waveCount)) {
    throw new RangeError('waveLengthMm is too small to resolve with finite coordinates.');
  }

  const segmentCount = Math.min(64, Math.max(8, Math.ceil(waveCount * 16)));
  const centerY = heightMm / 2;
  const points = Array.from({ length: segmentCount + 1 }, (_, index) => {
    const x = (widthMm / segmentCount) * index;
    const phaseTurns = (x / waveLengthMm) % 1;

    return {
      x: roundGeometryValue(x),
      y: roundGeometryValue(centerY - amplitudeMm * Math.sin(2 * Math.PI * phaseTurns)),
    };
  });

  return points.slice(1).map((end, index) => {
    const start = points[index];

    if (start === undefined) {
      throw new Error('Wave sampling produced an incomplete point sequence.');
    }

    return line(start, end);
  });
}

function resolveIntersection(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
  branchCount: 3 | 4,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const center = { x: widthMm / 2, y: heightMm / 2 };
  const segments = [
    line(center, { x: 0, y: center.y }),
    line(center, { x: widthMm, y: center.y }),
    line(center, { x: center.x, y: heightMm }),
  ];

  if (branchCount === 4) {
    segments.push(line(center, { x: center.x, y: 0 }));
  }

  return segments;
}

function validateCenteredTape(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
  tapeCenterMm: number,
): { leftEdgeMm: number; rightEdgeMm: number } {
  const { widthMm, heightMm } = getViewBoxDimensions(catalogItem);
  const tapeWidthMm = getEffectiveParameter(catalogItem, 'tapeWidthMm', parameters);
  const tapeLengthMm = getEffectiveParameter(catalogItem, 'tapeLengthMm', parameters);
  requirePositive('tapeWidthMm', tapeWidthMm);
  requirePositive('tapeLengthMm', tapeLengthMm);
  requireContainedLength('tapeWidthMm', tapeWidthMm, widthMm);
  requireContainedLength('tapeLengthMm', tapeLengthMm, heightMm);
  requireCoordinate('tapeCenterMm', tapeCenterMm, 0, widthMm);

  const leftEdgeMm = tapeCenterMm - tapeWidthMm / 2;
  const rightEdgeMm = tapeCenterMm + tapeWidthMm / 2;

  if (leftEdgeMm < 0 || rightEdgeMm > widthMm) {
    throw new RangeError(
      `The ${tapeWidthMm} mm tape centred at ${tapeCenterMm} mm does not fit inside the ${widthMm} mm piece.`,
    );
  }

  return { leftEdgeMm, rightEdgeMm };
}

function resolveGoalLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getTileDimensions(catalogItem, parameters);
  const tapeWidthMm = getEffectiveParameter(catalogItem, 'tapeWidthMm', parameters);
  const tapeLengthMm = getEffectiveParameter(catalogItem, 'tapeLengthMm', parameters);
  requirePositive('tapeWidthMm', tapeWidthMm);
  requirePositive('tapeLengthMm', tapeLengthMm);
  requireContainedLength('tapeWidthMm', tapeWidthMm, widthMm);
  requireContainedLength('tapeLengthMm', tapeLengthMm, heightMm);

  return horizontalLine(0, widthMm / 2 - tapeWidthMm / 2, heightMm / 2);
}

function resolveSpeedBumpLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm: availableWidthMm, heightMm: availableDepthMm } =
    getViewBoxDimensions(catalogItem);
  const widthMm = getEffectiveParameter(catalogItem, 'widthMm', parameters);
  const depthMm = getEffectiveParameter(catalogItem, 'depthMm', parameters);
  const cornerRadiusMm = getEffectiveParameter(catalogItem, 'cornerRadiusMm', parameters);
  requirePositive('widthMm', widthMm);
  requirePositive('depthMm', depthMm);
  requireContainedLength('widthMm', widthMm, availableWidthMm);
  requireContainedLength('depthMm', depthMm, availableDepthMm);
  requireNonNegative('cornerRadiusMm', cornerRadiusMm);

  if (cornerRadiusMm > Math.min(widthMm, depthMm) / 2) {
    throw new RangeError(
      `cornerRadiusMm (${cornerRadiusMm} mm) does not fit inside the ${widthMm} × ${depthMm} mm speed bump.`,
    );
  }

  // The route remains continuous across the speed bump; the short black
  // overlap is rendered on the physical bump, not treated as a line gap.
  return horizontalLine(0, availableWidthMm, availableDepthMm / 2);
}

function resolveObstacleLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
): GeometrySegment[] {
  const { widthMm, heightMm } = getViewBoxDimensions(catalogItem);
  const footprintWidthMm = getEffectiveParameter(catalogItem, 'footprintWidthMm', parameters);
  const footprintDepthMm = getEffectiveParameter(catalogItem, 'footprintDepthMm', parameters);
  requirePositive('footprintWidthMm', footprintWidthMm);
  requirePositive('footprintDepthMm', footprintDepthMm);
  requireContainedLength('footprintWidthMm', footprintWidthMm, widthMm);
  requireContainedLength('footprintDepthMm', footprintDepthMm, heightMm);

  const leftEdgeMm = (widthMm - footprintWidthMm) / 2;
  const rightEdgeMm = leftEdgeMm + footprintWidthMm;

  return [
    ...horizontalLine(0, leftEdgeMm, heightMm / 2),
    ...horizontalLine(rightEdgeMm, widthMm, heightMm / 2),
  ];
}

function resolveFullWidthLine(catalogItem: CatalogItem): GeometrySegment[] {
  const { widthMm, heightMm } = getViewBoxDimensions(catalogItem);
  return horizontalLine(0, widthMm, heightMm / 2);
}

function resolveRampLine(catalogItem: CatalogItem): GeometrySegment[] {
  const { widthMm, heightMm } = getViewBoxDimensions(catalogItem);
  return [line({ x: 0, y: heightMm }, { x: widthMm, y: 0 })];
}

function resolveEvacuationMarkerLine(
  catalogItem: CatalogItem,
  parameters: CatalogGeometryParameters,
  side: 'entrance' | 'exit',
): GeometrySegment[] {
  const { widthMm, heightMm } = getViewBoxDimensions(catalogItem);
  const tapeCenterMm = getEffectiveParameter(catalogItem, 'tapeCenterMm', parameters);
  const { leftEdgeMm, rightEdgeMm } = validateCenteredTape(catalogItem, parameters, tapeCenterMm);

  return side === 'entrance'
    ? horizontalLine(0, leftEdgeMm, heightMm / 2)
    : horizontalLine(rightEdgeMm, widthMm, heightMm / 2);
}

/**
 * Resolves the black route centreline for one catalog piece in local millimetres.
 *
 * Derived lengths are deliberately absent: consumers calculate them from the
 * returned segments. A finite numeric override wins over the catalog default;
 * every other override value falls back to that default.
 */
export function resolveCatalogGeometry(
  catalogItemId: string,
  parameters: CatalogGeometryParameters = {},
): GeometrySegment[] {
  const catalogItem = getCatalogItem(catalogItemId);

  switch (catalogItem.id) {
    case 'straightLine':
      return resolveStraightLine(catalogItem, parameters);
    case 'curveLine':
      return resolveCircularCurve(catalogItem, parameters);
    case 'gapLine':
      return resolveGapLine(catalogItem, parameters);
    case 'diagonalLine':
      return resolveDiagonalLine(catalogItem, parameters);
    case 'wavyLine':
      return resolveWavyLine(catalogItem, parameters);
    case 'threeWayIntersection':
    case 'deadEndIntersection':
    case 'startTile':
      return resolveIntersection(catalogItem, parameters, 3);
    case 'fourWayIntersection':
    case 'plainFourWayIntersection':
      return resolveIntersection(catalogItem, parameters, 4);
    case 'goalTile':
      return resolveGoalLine(catalogItem, parameters);
    case 'speedBump':
      return resolveSpeedBumpLine(catalogItem, parameters);
    case 'debris':
    case 'bridge':
    case 'seesaw':
      return resolveFullWidthLine(catalogItem);
    case 'ramp':
      return resolveRampLine(catalogItem);
    case 'obstacle':
      return resolveObstacleLine(catalogItem, parameters);
    case 'evacuationEntrance':
      return resolveEvacuationMarkerLine(catalogItem, parameters, 'entrance');
    case 'evacuationExit':
      return resolveEvacuationMarkerLine(catalogItem, parameters, 'exit');
    default:
      if (catalogItemsWithoutRouteGeometry.has(catalogItem.id)) {
        return [];
      }

      throw new Error(
        `Catalog geometry resolver has no declared behaviour for "${catalogItem.id}".`,
      );
  }
}
