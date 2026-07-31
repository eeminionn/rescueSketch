import type { GeometrySegment, TrackDocumentV1, TrackStructure, TrackTile } from '../../domain';

export const fabricationReportVersion = '1.0.0' as const;

export type FabricationElement = TrackTile | TrackStructure;

export type FabricationGeometryResolver = (
  element: FabricationElement,
  document: TrackDocumentV1,
) => readonly GeometrySegment[] | undefined;

export interface FabricationReportOptions {
  wasteRatio?: number;
  resolveGeometry?: FabricationGeometryResolver;
}

export interface FabricationCanvasSummary {
  widthMm: number;
  heightMm: number;
  areaSquareMm: number;
  tileSizeMm: number;
  gridSizeMm: number;
  levelCount: number;
}

export interface FabricationElementSummary {
  total: number;
  tileCount: number;
  structureCount: number;
  totalLineLengthMm: number;
  uniqueRadiiMm: readonly number[];
}

export interface FabricationSummary {
  canvas: FabricationCanvasSummary;
  elements: FabricationElementSummary;
}

export interface FabricationFootprint {
  baseWidthMm: number;
  baseDepthMm: number;
  widthMm: number;
  depthMm: number;
  minXmm: number;
  minYmm: number;
  maxXmm: number;
  maxYmm: number;
}

export interface FabricationElementMeasurement {
  elementId: string;
  elementType: 'tile' | 'structure';
  catalogItemId: string;
  levelId: string;
  positionMm: {
    x: number;
    y: number;
  };
  rotationQuarterTurns: 0 | 1 | 2 | 3;
  footprint: FabricationFootprint;
  lineLengthMm: number;
  radiiMm: readonly number[];
}

export type ElementMeasurement = FabricationElementMeasurement;

export type FabricationTapeColor = 'black' | 'red' | 'silver';

export interface FabricationTapeRequirement {
  color: FabricationTapeColor;
  widthMm: number;
  netLengthMm: number;
  purchaseLengthMm: number;
  wasteRatio: number;
  sourceElementIds: readonly string[];
}

export type FabricationInventoryGroup = 'piece' | 'structure' | 'victim' | 'hazard';

export interface FabricationInventoryItem {
  group: FabricationInventoryGroup;
  catalogItemId: string;
  names: {
    es: string;
    en: string;
  };
  quantity: number;
  sourceElementIds: readonly string[];
}

export type FabricationMaterialId =
  'evacuationWall' | 'bridgePillar' | 'livingSafePointWall' | 'deadSafePointWall';

export interface FabricationMaterialRequirement {
  materialId: FabricationMaterialId;
  unit: 'linearMm' | 'piece';
  quantity: number;
  netLengthMm: number;
  specification: Readonly<Record<string, number>>;
  sourceElementIds: readonly string[];
}

export interface FabricationInventory {
  items: readonly FabricationInventoryItem[];
  materials: readonly FabricationMaterialRequirement[];
}

export interface FabricationReport {
  reportVersion: typeof fabricationReportVersion;
  source: {
    schemaVersion: string;
    rulesetVersion: string;
    catalogVersion: string;
  };
  wasteRatio: number;
  summary: FabricationSummary;
  measurements: readonly FabricationElementMeasurement[];
  tapeRequirements: readonly FabricationTapeRequirement[];
  inventory: FabricationInventory;
}
