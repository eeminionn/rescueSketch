import { z } from 'zod';

const precisionFactor = 1_000_000_000;

export const pointSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();

export const lineSegmentSchema = z
  .object({
    kind: z.literal('line'),
    start: pointSchema,
    end: pointSchema,
  })
  .strict();

export const circularArcSegmentSchema = z
  .object({
    kind: z.literal('circularArc'),
    center: pointSchema,
    radius: z.number().finite().positive(),
    startAngleDeg: z.number().finite(),
    endAngleDeg: z.number().finite(),
    clockwise: z.boolean(),
  })
  .strict();

export const geometrySegmentSchema = z.discriminatedUnion('kind', [
  lineSegmentSchema,
  circularArcSegmentSchema,
]);

export type Point = z.infer<typeof pointSchema>;
export type LineSegment = z.infer<typeof lineSegmentSchema>;
export type CircularArcSegment = z.infer<typeof circularArcSegmentSchema>;
export type GeometrySegment = z.infer<typeof geometrySegmentSchema>;
export type QuarterTurns = 0 | 1 | 2 | 3;

export function roundGeometryValue(value: number): number {
  return Math.round(value * precisionFactor) / precisionFactor;
}

export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return roundGeometryValue(normalized < 0 ? normalized + 360 : normalized);
}

export function getArcSweepDegrees(segment: CircularArcSegment): number {
  const start = normalizeDegrees(segment.startAngleDeg);
  const end = normalizeDegrees(segment.endAngleDeg);

  if (segment.clockwise) {
    return roundGeometryValue((start - end + 360) % 360);
  }

  return roundGeometryValue((end - start + 360) % 360);
}

export function getSegmentLength(segment: GeometrySegment): number {
  if (segment.kind === 'line') {
    return roundGeometryValue(
      Math.hypot(segment.end.x - segment.start.x, segment.end.y - segment.start.y),
    );
  }

  return roundGeometryValue((segment.radius * (getArcSweepDegrees(segment) * Math.PI)) / 180);
}

export function getGeometryLength(segments: readonly GeometrySegment[]): number {
  return roundGeometryValue(
    segments.reduce((total, segment) => total + getSegmentLength(segment), 0),
  );
}

export function rotatePoint(
  point: Point,
  quarterTurns: QuarterTurns,
  origin: Point = { x: 0, y: 0 },
): Point {
  const relativeX = point.x - origin.x;
  const relativeY = point.y - origin.y;

  switch (quarterTurns) {
    case 0:
      return { x: roundGeometryValue(point.x), y: roundGeometryValue(point.y) };
    case 1:
      return {
        x: roundGeometryValue(origin.x - relativeY),
        y: roundGeometryValue(origin.y + relativeX),
      };
    case 2:
      return {
        x: roundGeometryValue(origin.x - relativeX),
        y: roundGeometryValue(origin.y - relativeY),
      };
    case 3:
      return {
        x: roundGeometryValue(origin.x + relativeY),
        y: roundGeometryValue(origin.y - relativeX),
      };
  }
}

export function rotateSegment(
  segment: GeometrySegment,
  quarterTurns: QuarterTurns,
  origin: Point = { x: 0, y: 0 },
): GeometrySegment {
  if (segment.kind === 'line') {
    return {
      kind: 'line',
      start: rotatePoint(segment.start, quarterTurns, origin),
      end: rotatePoint(segment.end, quarterTurns, origin),
    };
  }

  const angleOffset = quarterTurns * 90;

  return {
    ...segment,
    center: rotatePoint(segment.center, quarterTurns, origin),
    startAngleDeg: normalizeDegrees(segment.startAngleDeg + angleOffset),
    endAngleDeg: normalizeDegrees(segment.endAngleDeg + angleOffset),
  };
}

export function snapPoint(point: Point, gridSizeMm: number): Point {
  if (!Number.isFinite(gridSizeMm) || gridSizeMm <= 0) {
    throw new RangeError('gridSizeMm must be a positive finite number.');
  }

  return {
    x: roundGeometryValue(Math.round(point.x / gridSizeMm) * gridSizeMm),
    y: roundGeometryValue(Math.round(point.y / gridSizeMm) * gridSizeMm),
  };
}

export function arePointsConnected(first: Point, second: Point, toleranceMm = 0.001): boolean {
  if (!Number.isFinite(toleranceMm) || toleranceMm < 0) {
    throw new RangeError('toleranceMm must be a non-negative finite number.');
  }

  return Math.hypot(first.x - second.x, first.y - second.y) <= toleranceMm;
}
