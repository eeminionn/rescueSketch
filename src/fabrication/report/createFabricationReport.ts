import { getCatalogItem, type CatalogItem } from '../../catalog';
import {
  getGeometryLength,
  roundGeometryValue,
  rotatePoint,
  type GeometrySegment,
  type Point,
  type TrackDocumentV1,
  type TrackStructure,
} from '../../domain';
import {
  fabricationReportVersion,
  type FabricationElement,
  type FabricationElementMeasurement,
  type FabricationInventoryGroup,
  type FabricationInventoryItem,
  type FabricationMaterialId,
  type FabricationMaterialRequirement,
  type FabricationReport,
  type FabricationReportOptions,
  type FabricationTapeColor,
  type FabricationTapeRequirement,
} from './reportTypes';

const defaultWasteRatio = 0.1;

const lineBearingCatalogItemIds = new Set([
  'straightLine',
  'curveLine',
  'gapLine',
  'diagonalLine',
  'wavyLine',
  'threeWayIntersection',
  'fourWayIntersection',
  'deadEndIntersection',
  'goalTile',
  'speedBump',
  'debris',
  'obstacle',
  'ramp',
  'bridge',
  'seesaw',
  'evacuationEntrance',
  'evacuationExit',
]);

const hazardCatalogItemIds = new Set(['speedBump', 'debris', 'obstacle']);

const victimCatalogItemIds = new Set(['livingVictim', 'deadVictim']);

interface ResolvedElement {
  element: FabricationElement;
  elementType: 'tile' | 'structure';
  catalogItemId: string;
  catalogItem: CatalogItem | undefined;
  geometry: readonly GeometrySegment[];
}

interface TapeAccumulator {
  color: FabricationTapeColor;
  widthMm: number;
  netLengthMm: number;
  sourceElementIds: string[];
}

interface InventoryAccumulator {
  group: FabricationInventoryGroup;
  catalogItemId: string;
  names: {
    es: string;
    en: string;
  };
  sourceElementIds: string[];
}

interface MaterialAccumulator {
  materialId: FabricationMaterialId;
  unit: 'linearMm' | 'piece';
  quantity: number;
  netLengthMm: number;
  specification: Readonly<Record<string, number>>;
  sourceElementIds: string[];
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getParameterDefault(catalogItem: CatalogItem | undefined, parameterId: string) {
  return [
    ...(catalogItem?.parameters.normative ?? []),
    ...(catalogItem?.parameters.constructionParameter ?? []),
  ].find(({ id }) => id === parameterId)?.defaultValue;
}

function getEffectiveNumber(
  element: FabricationElement,
  catalogItem: CatalogItem | undefined,
  parameterId: string,
  fallback = 0,
): number {
  return roundGeometryValue(
    asFiniteNumber(element.parameters[parameterId]) ??
      getParameterDefault(catalogItem, parameterId) ??
      asFiniteNumber(catalogItem?.nominalDimensions[parameterId]) ??
      fallback,
  );
}

function tryGetCatalogItem(catalogItemId: string): CatalogItem | undefined {
  try {
    return getCatalogItem(catalogItemId);
  } catch {
    return undefined;
  }
}

function resolveElements(
  document: TrackDocumentV1,
  options: FabricationReportOptions,
): ResolvedElement[] {
  const resolve = (
    element: FabricationElement,
    elementType: ResolvedElement['elementType'],
    catalogItemId: string,
  ): ResolvedElement => ({
    element,
    elementType,
    catalogItemId,
    catalogItem: tryGetCatalogItem(catalogItemId),
    geometry: options.resolveGeometry?.(element, document) ?? element.geometry,
  });

  return [
    ...document.tiles.map((tile) => resolve(tile, 'tile', tile.catalogItemId)),
    ...document.structures.map((structure) => resolve(structure, 'structure', structure.kind)),
  ].sort((left, right) => compareCodeUnits(left.element.id, right.element.id));
}

interface LocalFootprint {
  xMm: number;
  yMm: number;
  widthMm: number;
  depthMm: number;
  descriptorWidthMm: number;
  descriptorDepthMm: number;
}

function getDescriptorDimensions(catalogItem: CatalogItem | undefined): {
  widthMm: number;
  depthMm: number;
} {
  return {
    widthMm: catalogItem?.svgDescriptor.viewBox.width ?? 300,
    depthMm: catalogItem?.svgDescriptor.viewBox.height ?? 300,
  };
}

function createLocalFootprint(
  catalogItem: CatalogItem | undefined,
  widthMm: number,
  depthMm: number,
  xMm = 0,
  yMm = 0,
): LocalFootprint {
  const descriptor = getDescriptorDimensions(catalogItem);

  return {
    xMm,
    yMm,
    widthMm,
    depthMm,
    descriptorWidthMm: descriptor.widthMm,
    descriptorDepthMm: descriptor.depthMm,
  };
}

function centeredLocalFootprint(
  catalogItem: CatalogItem | undefined,
  widthMm: number,
  depthMm: number,
): LocalFootprint {
  const descriptor = getDescriptorDimensions(catalogItem);

  return createLocalFootprint(
    catalogItem,
    widthMm,
    depthMm,
    (descriptor.widthMm - widthMm) / 2,
    (descriptor.depthMm - depthMm) / 2,
  );
}

function getTileFootprint(
  element: FabricationElement,
  catalogItem: CatalogItem | undefined,
): LocalFootprint {
  if (catalogItem?.kind === 'victim') {
    const diameterMm = getEffectiveNumber(element, catalogItem, 'diameterMm');
    return centeredLocalFootprint(catalogItem, diameterMm, diameterMm);
  }

  if (catalogItem?.id === 'checkpoint') {
    const diameterMm = getEffectiveNumber(element, catalogItem, 'diameterMm');
    return centeredLocalFootprint(catalogItem, diameterMm, diameterMm);
  }

  if (catalogItem?.id === 'evacuationEntrance' || catalogItem?.id === 'evacuationExit') {
    const descriptor = getDescriptorDimensions(catalogItem);
    const widthMm = getEffectiveNumber(element, catalogItem, 'tapeWidthMm');
    const depthMm = getEffectiveNumber(element, catalogItem, 'tapeLengthMm');

    return createLocalFootprint(
      catalogItem,
      widthMm,
      depthMm,
      (descriptor.widthMm - widthMm) / 2,
      (descriptor.depthMm - depthMm) / 2,
    );
  }

  const widthMm = getEffectiveNumber(
    element,
    catalogItem,
    'tileWidthMm',
    asFiniteNumber(catalogItem?.nominalDimensions.widthMm) ??
      asFiniteNumber(catalogItem?.svgDescriptor.viewBox.width) ??
      300,
  );
  const depthMm = getEffectiveNumber(
    element,
    catalogItem,
    'tileHeightMm',
    asFiniteNumber(catalogItem?.nominalDimensions.heightMm) ??
      asFiniteNumber(catalogItem?.svgDescriptor.viewBox.height) ??
      300,
  );

  return createLocalFootprint(catalogItem, widthMm, depthMm);
}

function getStructureFootprint(
  element: TrackStructure,
  catalogItem: CatalogItem | undefined,
): LocalFootprint {
  switch (element.kind) {
    case 'evacuationZone':
      return createLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'widthMm', 1_200),
        getEffectiveNumber(element, catalogItem, 'heightMm', 900),
      );
    case 'obstacle':
      return centeredLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'footprintWidthMm', 150),
        getEffectiveNumber(element, catalogItem, 'footprintDepthMm', 150),
      );
    case 'debris':
      return centeredLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'previewWidthMm', 80),
        getEffectiveNumber(element, catalogItem, 'previewDepthMm', 40),
      );
    case 'speedBump':
      return centeredLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'widthMm', 300),
        getEffectiveNumber(element, catalogItem, 'depthMm', 300),
      );
    case 'ramp':
    case 'bridge':
    case 'seesaw':
      return createLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'tileWidthMm', 300),
        getEffectiveNumber(element, catalogItem, 'tileHeightMm', 300),
      );
    case 'pillar':
      return centeredLocalFootprint(
        catalogItem,
        getEffectiveNumber(element, catalogItem, 'widthMm', 25),
        getEffectiveNumber(element, catalogItem, 'depthMm', 25),
      );
    case 'livingSafePoint':
    case 'deadSafePoint': {
      const legLengthMm = getEffectiveNumber(element, catalogItem, 'legLengthMm', 300);
      return createLocalFootprint(catalogItem, legLengthMm, legLengthMm);
    }
  }
}

function getFootprint(
  resolvedElement: ResolvedElement,
): FabricationElementMeasurement['footprint'] {
  const localFootprint =
    resolvedElement.elementType === 'tile'
      ? getTileFootprint(resolvedElement.element, resolvedElement.catalogItem)
      : getStructureFootprint(
          resolvedElement.element as TrackStructure,
          resolvedElement.catalogItem,
        );
  const rotationOrigin: Point = {
    x: localFootprint.descriptorWidthMm / 2,
    y: localFootprint.descriptorDepthMm / 2,
  };
  const corners: readonly Point[] = [
    { x: localFootprint.xMm, y: localFootprint.yMm },
    { x: localFootprint.xMm + localFootprint.widthMm, y: localFootprint.yMm },
    {
      x: localFootprint.xMm + localFootprint.widthMm,
      y: localFootprint.yMm + localFootprint.depthMm,
    },
    { x: localFootprint.xMm, y: localFootprint.yMm + localFootprint.depthMm },
  ].map((corner) => rotatePoint(corner, resolvedElement.element.rotation, rotationOrigin));
  const minXLocalMm = Math.min(...corners.map(({ x }) => x));
  const minYLocalMm = Math.min(...corners.map(({ y }) => y));
  const maxXLocalMm = Math.max(...corners.map(({ x }) => x));
  const maxYLocalMm = Math.max(...corners.map(({ y }) => y));
  const widthMm = roundGeometryValue(maxXLocalMm - minXLocalMm);
  const depthMm = roundGeometryValue(maxYLocalMm - minYLocalMm);
  const minXmm = roundGeometryValue(resolvedElement.element.position.x + minXLocalMm);
  const minYmm = roundGeometryValue(resolvedElement.element.position.y + minYLocalMm);

  return {
    baseWidthMm: roundGeometryValue(localFootprint.widthMm),
    baseDepthMm: roundGeometryValue(localFootprint.depthMm),
    widthMm,
    depthMm,
    minXmm,
    minYmm,
    maxXmm: roundGeometryValue(minXmm + widthMm),
    maxYmm: roundGeometryValue(minYmm + depthMm),
  };
}

function getUniqueRadii(geometry: readonly GeometrySegment[]): number[] {
  return [
    ...new Set(
      geometry
        .filter((segment) => segment.kind === 'circularArc')
        .map(({ radius }) => roundGeometryValue(radius)),
    ),
  ].sort(compareNumbers);
}

function createMeasurements(elements: readonly ResolvedElement[]): FabricationElementMeasurement[] {
  return elements.map((resolvedElement) => ({
    elementId: resolvedElement.element.id,
    elementType: resolvedElement.elementType,
    catalogItemId: resolvedElement.catalogItemId,
    levelId: resolvedElement.element.levelId,
    positionMm: {
      x: roundGeometryValue(resolvedElement.element.position.x),
      y: roundGeometryValue(resolvedElement.element.position.y),
    },
    rotationQuarterTurns: resolvedElement.element.rotation,
    footprint: getFootprint(resolvedElement),
    lineLengthMm: getGeometryLength(resolvedElement.geometry),
    radiiMm: getUniqueRadii(resolvedElement.geometry),
  }));
}

function tapeKey(color: FabricationTapeColor, widthMm: number): string {
  return `${color}:${String(widthMm)}`;
}

function addTape(
  accumulators: Map<string, TapeAccumulator>,
  input: {
    color: FabricationTapeColor;
    widthMm: number;
    lengthMm: number;
    sourceElementId: string;
  },
) {
  const widthMm = roundGeometryValue(input.widthMm);
  const lengthMm = roundGeometryValue(input.lengthMm);

  if (widthMm <= 0 || lengthMm <= 0) {
    return;
  }

  const key = tapeKey(input.color, widthMm);
  const accumulator = accumulators.get(key) ?? {
    color: input.color,
    widthMm,
    netLengthMm: 0,
    sourceElementIds: [],
  };

  accumulator.netLengthMm = roundGeometryValue(accumulator.netLengthMm + lengthMm);
  accumulator.sourceElementIds.push(input.sourceElementId);
  accumulators.set(key, accumulator);
}

function createTapeRequirements(
  elements: readonly ResolvedElement[],
  measurementsById: ReadonlyMap<string, FabricationElementMeasurement>,
  wasteRatio: number,
): FabricationTapeRequirement[] {
  const accumulators = new Map<string, TapeAccumulator>();

  for (const resolvedElement of elements) {
    const { catalogItem, catalogItemId, element } = resolvedElement;
    const measurement = measurementsById.get(element.id);

    if (
      measurement !== undefined &&
      lineBearingCatalogItemIds.has(catalogItemId) &&
      measurement.lineLengthMm > 0
    ) {
      addTape(accumulators, {
        color: 'black',
        widthMm: getEffectiveNumber(element, catalogItem, 'lineWidthMm', 15),
        lengthMm: measurement.lineLengthMm,
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'goalTile') {
      addTape(accumulators, {
        color: 'red',
        widthMm: getEffectiveNumber(element, catalogItem, 'tapeWidthMm', 25),
        lengthMm: getEffectiveNumber(element, catalogItem, 'tapeLengthMm', 300),
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'evacuationEntrance') {
      addTape(accumulators, {
        color: 'silver',
        widthMm: getEffectiveNumber(element, catalogItem, 'tapeWidthMm', 25),
        lengthMm: getEffectiveNumber(element, catalogItem, 'tapeLengthMm', 250),
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'evacuationExit') {
      addTape(accumulators, {
        color: 'black',
        widthMm: getEffectiveNumber(element, catalogItem, 'tapeWidthMm', 25),
        lengthMm: getEffectiveNumber(element, catalogItem, 'tapeLengthMm', 250),
        sourceElementId: element.id,
      });
    }
  }

  return [...accumulators.values()]
    .map((accumulator) => ({
      color: accumulator.color,
      widthMm: accumulator.widthMm,
      netLengthMm: accumulator.netLengthMm,
      purchaseLengthMm: roundGeometryValue(accumulator.netLengthMm * (1 + wasteRatio)),
      wasteRatio,
      sourceElementIds: [...new Set(accumulator.sourceElementIds)].sort(compareCodeUnits),
    }))
    .sort(
      (left, right) =>
        compareCodeUnits(left.color, right.color) || compareNumbers(left.widthMm, right.widthMm),
    );
}

function getInventoryGroup(resolvedElement: ResolvedElement): FabricationInventoryGroup {
  if (victimCatalogItemIds.has(resolvedElement.catalogItemId)) {
    return 'victim';
  }

  if (hazardCatalogItemIds.has(resolvedElement.catalogItemId)) {
    return 'hazard';
  }

  return resolvedElement.elementType === 'structure' ? 'structure' : 'piece';
}

function createInventoryItems(elements: readonly ResolvedElement[]): FabricationInventoryItem[] {
  const accumulators = new Map<string, InventoryAccumulator>();

  for (const resolvedElement of elements) {
    const group = getInventoryGroup(resolvedElement);
    const key = `${group}:${resolvedElement.catalogItemId}`;
    const names = resolvedElement.catalogItem?.names ?? {
      es: resolvedElement.catalogItemId,
      en: resolvedElement.catalogItemId,
    };
    const accumulator = accumulators.get(key) ?? {
      group,
      catalogItemId: resolvedElement.catalogItemId,
      names: { ...names },
      sourceElementIds: [],
    };

    accumulator.sourceElementIds.push(resolvedElement.element.id);
    accumulators.set(key, accumulator);
  }

  return [...accumulators.values()]
    .map((accumulator) => ({
      group: accumulator.group,
      catalogItemId: accumulator.catalogItemId,
      names: { ...accumulator.names },
      quantity: accumulator.sourceElementIds.length,
      sourceElementIds: [...accumulator.sourceElementIds].sort(compareCodeUnits),
    }))
    .sort(
      (left, right) =>
        compareCodeUnits(left.group, right.group) ||
        compareCodeUnits(left.catalogItemId, right.catalogItemId),
    );
}

function materialKey(
  materialId: FabricationMaterialId,
  specification: Readonly<Record<string, number>>,
): string {
  return `${materialId}:${Object.entries(specification)
    .sort(([left], [right]) => compareCodeUnits(left, right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(',')}`;
}

function addMaterial(
  accumulators: Map<string, MaterialAccumulator>,
  input: Omit<MaterialAccumulator, 'sourceElementIds'> & { sourceElementId: string },
) {
  const specification = Object.fromEntries(
    Object.entries(input.specification)
      .map(([key, value]) => [key, roundGeometryValue(value)] as const)
      .sort(([left], [right]) => compareCodeUnits(left, right)),
  );
  const key = materialKey(input.materialId, specification);
  const accumulator = accumulators.get(key) ?? {
    materialId: input.materialId,
    unit: input.unit,
    quantity: 0,
    netLengthMm: 0,
    specification,
    sourceElementIds: [],
  };

  accumulator.quantity += input.quantity;
  accumulator.netLengthMm = roundGeometryValue(accumulator.netLengthMm + input.netLengthMm);
  accumulator.sourceElementIds.push(input.sourceElementId);
  accumulators.set(key, accumulator);
}

function createMaterialRequirements(
  elements: readonly ResolvedElement[],
): FabricationMaterialRequirement[] {
  const accumulators = new Map<string, MaterialAccumulator>();

  for (const { catalogItem, catalogItemId, element } of elements) {
    if (catalogItemId === 'evacuationZone') {
      const widthMm = getEffectiveNumber(element, catalogItem, 'widthMm', 1_200);
      const depthMm = getEffectiveNumber(element, catalogItem, 'heightMm', 900);
      const wallHeightMm = getEffectiveNumber(element, catalogItem, 'wallHeightMm', 100);
      addMaterial(accumulators, {
        materialId: 'evacuationWall',
        unit: 'linearMm',
        quantity: 1,
        netLengthMm: roundGeometryValue(2 * (widthMm + depthMm)),
        specification: { widthMm, depthMm, wallHeightMm },
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'pillar') {
      const widthMm = getEffectiveNumber(element, catalogItem, 'widthMm', 25);
      const depthMm = getEffectiveNumber(element, catalogItem, 'depthMm', widthMm);
      const heightMm = getEffectiveNumber(element, catalogItem, 'heightMm', 250);
      addMaterial(accumulators, {
        materialId: 'bridgePillar',
        unit: 'piece',
        quantity: 1,
        netLengthMm: heightMm,
        specification: { widthMm, depthMm, heightMm },
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'bridge') {
      const widthMm = getEffectiveNumber(element, catalogItem, 'pillarWidthMm', 25);
      const heightMm = getEffectiveNumber(element, catalogItem, 'clearanceHeightMm', 250);
      const pillarCount = 4;
      addMaterial(accumulators, {
        materialId: 'bridgePillar',
        unit: 'piece',
        quantity: pillarCount,
        netLengthMm: roundGeometryValue(heightMm * pillarCount),
        specification: { widthMm, depthMm: widthMm, heightMm },
        sourceElementId: element.id,
      });
    }

    if (catalogItemId === 'livingSafePoint' || catalogItemId === 'deadSafePoint') {
      const legLengthMm = getEffectiveNumber(element, catalogItem, 'legLengthMm', 300);
      const wallWidthMm = getEffectiveNumber(element, catalogItem, 'wallWidthMm', 60);
      const materialId =
        catalogItemId === 'livingSafePoint' ? 'livingSafePointWall' : 'deadSafePointWall';
      addMaterial(accumulators, {
        materialId,
        unit: 'linearMm',
        quantity: 1,
        netLengthMm: roundGeometryValue(legLengthMm * (2 + Math.SQRT2)),
        specification: { wallWidthMm, legLengthMm },
        sourceElementId: element.id,
      });
    }
  }

  return [...accumulators.values()]
    .map((accumulator) => ({
      materialId: accumulator.materialId,
      unit: accumulator.unit,
      quantity: accumulator.quantity,
      netLengthMm: accumulator.netLengthMm,
      specification: accumulator.specification,
      sourceElementIds: [...new Set(accumulator.sourceElementIds)].sort(compareCodeUnits),
    }))
    .sort(
      (left, right) =>
        compareCodeUnits(left.materialId, right.materialId) ||
        compareCodeUnits(JSON.stringify(left.specification), JSON.stringify(right.specification)),
    );
}

function validateWasteRatio(wasteRatio: number): number {
  if (!Number.isFinite(wasteRatio) || wasteRatio < 0 || wasteRatio > 1) {
    throw new RangeError('wasteRatio must be a finite number between 0 and 1.');
  }

  return roundGeometryValue(wasteRatio);
}

export function createFabricationReport(
  document: TrackDocumentV1,
  options: FabricationReportOptions = {},
): FabricationReport {
  const wasteRatio = validateWasteRatio(options.wasteRatio ?? defaultWasteRatio);
  const elements = resolveElements(document, options);
  const measurements = createMeasurements(elements);
  const measurementsById = new Map(
    measurements.map((measurement) => [measurement.elementId, measurement] as const),
  );
  const totalLineLengthMm = roundGeometryValue(
    measurements.reduce((total, measurement) => total + measurement.lineLengthMm, 0),
  );
  const uniqueRadiiMm = [...new Set(measurements.flatMap(({ radiiMm }) => radiiMm))].sort(
    compareNumbers,
  );

  return {
    reportVersion: fabricationReportVersion,
    source: {
      schemaVersion: document.schemaVersion,
      rulesetVersion: document.rulesetVersion,
      catalogVersion: document.catalogVersion,
    },
    wasteRatio,
    summary: {
      canvas: {
        widthMm: roundGeometryValue(document.canvas.widthMm),
        heightMm: roundGeometryValue(document.canvas.heightMm),
        areaSquareMm: roundGeometryValue(document.canvas.widthMm * document.canvas.heightMm),
        tileSizeMm: roundGeometryValue(document.canvas.tileSizeMm),
        gridSizeMm: roundGeometryValue(document.canvas.gridSizeMm),
        levelCount: document.levels.length,
      },
      elements: {
        total: elements.length,
        tileCount: document.tiles.length,
        structureCount: document.structures.length,
        totalLineLengthMm,
        uniqueRadiiMm,
      },
    },
    measurements,
    tapeRequirements: createTapeRequirements(elements, measurementsById, wasteRatio),
    inventory: {
      items: createInventoryItems(elements),
      materials: createMaterialRequirements(elements),
    },
  };
}
