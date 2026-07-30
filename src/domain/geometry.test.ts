import {
  arePointsConnected,
  getArcSweepDegrees,
  getGeometryLength,
  getSegmentLength,
  rotatePoint,
  rotateSegment,
  snapPoint,
  type CircularArcSegment,
  type GeometrySegment,
  type Point,
  type QuarterTurns,
} from './geometry';

describe('geometry', () => {
  it('calculates deterministic line and circular-arc lengths in millimetres', () => {
    const line: GeometrySegment = {
      kind: 'line',
      start: { x: 0, y: 0 },
      end: { x: 300, y: 400 },
    };
    const arc: CircularArcSegment = {
      kind: 'circularArc',
      center: { x: 0, y: 0 },
      radius: 100,
      startAngleDeg: 0,
      endAngleDeg: 90,
      clockwise: false,
    };

    expect(getSegmentLength(line)).toBe(500);
    expect(getArcSweepDegrees(arc)).toBe(90);
    expect(getSegmentLength(arc)).toBeCloseTo(Math.PI * 50, 8);
    expect(getGeometryLength([line, arc])).toBeCloseTo(500 + Math.PI * 50, 8);
  });

  it('keeps lengths invariant for every quarter-turn rotation', () => {
    const segments: GeometrySegment[] = [
      {
        kind: 'line',
        start: { x: -25, y: 30 },
        end: { x: 275, y: 30 },
      },
      {
        kind: 'circularArc',
        center: { x: 150, y: 150 },
        radius: 125,
        startAngleDeg: 15,
        endAngleDeg: 245,
        clockwise: true,
      },
    ];

    for (const quarterTurns of [0, 1, 2, 3] as QuarterTurns[]) {
      const rotated = segments.map((segment) =>
        rotateSegment(segment, quarterTurns, { x: 150, y: 150 }),
      );

      expect(getGeometryLength(rotated)).toBeCloseTo(getGeometryLength(segments), 8);
    }
  });

  it('returns a point to its origin after four quarter-turns', () => {
    const samples: Point[] = [
      { x: 0, y: 0 },
      { x: 10.125, y: -45.5 },
      { x: 300, y: 300 },
      { x: -1_000.25, y: 800.75 },
    ];

    for (const sample of samples) {
      let rotated = sample;

      for (let index = 0; index < 4; index += 1) {
        rotated = rotatePoint(rotated, 1, { x: 17, y: 23 });
      }

      expect(rotated).toEqual(sample);
    }
  });

  it('snaps coordinates and checks connectivity with an explicit tolerance', () => {
    expect(snapPoint({ x: 143, y: 156 }, 10)).toEqual({ x: 140, y: 160 });
    expect(arePointsConnected({ x: 0, y: 0 }, { x: 0.0005, y: 0.0005 })).toBe(true);
    expect(arePointsConnected({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(false);
    expect(() => snapPoint({ x: 0, y: 0 }, 0)).toThrow(RangeError);
  });
});
