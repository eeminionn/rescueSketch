import type { SvgDescriptor } from './catalogTypes';

const tileBackground = {
  type: 'rect',
  x: 0,
  y: 0,
  width: 300,
  height: 300,
  fill: 'tile',
  stroke: 'structure',
  strokeWidthMm: 2,
} as const;

function linePath(d: string, strokeWidthMm = 15) {
  return {
    type: 'path',
    d,
    fill: 'none',
    stroke: 'line',
    strokeWidthMm,
    lineCap: 'butt',
    lineJoin: 'round',
  } as const;
}

function tileDescriptor(
  primitives: SvgDescriptor['primitives'],
  includeBackground = true,
): SvgDescriptor {
  return {
    viewBox: { x: 0, y: 0, width: 300, height: 300 },
    primitives: includeBackground ? [tileBackground, ...primitives] : primitives,
  };
}

export const straightLineDescriptor = tileDescriptor([linePath('M 0 150 L 300 150')]);

export const curveLineDescriptor = tileDescriptor([linePath('M 0 150 A 150 150 0 0 1 150 300')]);

export const gapLineDescriptor = tileDescriptor([
  linePath('M 0 150 L 75 150'),
  linePath('M 225 150 L 300 150'),
]);

export const diagonalLineDescriptor = tileDescriptor([linePath('M 0 300 L 300 0')]);

export const wavyLineDescriptor = tileDescriptor([
  linePath('M 0 150 C 50 60 100 240 150 150 S 250 60 300 150'),
]);

export const threeWayIntersectionDescriptor = tileDescriptor([
  linePath('M 0 150 L 300 150 M 150 150 L 150 300'),
  {
    type: 'rect',
    x: 113,
    y: 173,
    width: 25,
    height: 25,
    fill: 'greenMarker',
    stroke: 'none',
    strokeWidthMm: 0,
  },
]);

export const fourWayIntersectionDescriptor = tileDescriptor([
  linePath('M 0 150 L 300 150 M 150 0 L 150 300'),
  {
    type: 'rect',
    x: 173,
    y: 113,
    width: 25,
    height: 25,
    fill: 'greenMarker',
    stroke: 'none',
    strokeWidthMm: 0,
  },
]);

export const deadEndIntersectionDescriptor = tileDescriptor([
  linePath('M 0 150 L 300 150 M 150 150 L 150 300'),
  {
    type: 'rect',
    x: 95,
    y: 173,
    width: 25,
    height: 25,
    fill: 'greenMarker',
    stroke: 'none',
    strokeWidthMm: 0,
  },
  {
    type: 'rect',
    x: 95,
    y: 102,
    width: 25,
    height: 25,
    fill: 'greenMarker',
    stroke: 'none',
    strokeWidthMm: 0,
  },
]);

export const goalTileDescriptor = tileDescriptor([
  linePath('M 0 150 L 138 150'),
  {
    type: 'rect',
    x: 137.5,
    y: 0,
    width: 25,
    height: 300,
    fill: 'redMarker',
    stroke: 'none',
    strokeWidthMm: 0,
  },
]);

export const speedBumpDescriptor = tileDescriptor([
  {
    type: 'rect',
    x: 24,
    y: 90,
    width: 252,
    height: 120,
    radius: 12,
    fill: 'hazard',
    stroke: 'structure',
    strokeWidthMm: 4,
  },
  linePath('M 24 150 L 276 150'),
]);

export const debrisDescriptor = tileDescriptor([
  {
    type: 'path',
    d: 'M 52 92 L 117 133 M 180 75 L 157 147 M 72 218 L 145 185 M 193 188 L 250 225',
    fill: 'none',
    stroke: 'hazard',
    strokeWidthMm: 7,
    lineCap: 'round',
  },
  linePath('M 0 150 L 300 150'),
]);

export const obstacleDescriptor = tileDescriptor([
  {
    type: 'rect',
    x: 92,
    y: 75,
    width: 116,
    height: 150,
    radius: 8,
    fill: 'hazard',
    stroke: 'structure',
    strokeWidthMm: 6,
  },
  linePath('M 0 150 L 75 150 M 225 150 L 300 150'),
]);

export const rampDescriptor = tileDescriptor([
  {
    type: 'polygon',
    points: [
      { x: 24, y: 240 },
      { x: 276, y: 240 },
      { x: 276, y: 72 },
    ],
    fill: 'structure',
    stroke: 'line',
    strokeWidthMm: 4,
  },
  linePath('M 24 156 L 276 156'),
]);

export const bridgeDescriptor = tileDescriptor([
  {
    type: 'rect',
    x: 25,
    y: 82,
    width: 250,
    height: 136,
    fill: 'structure',
    stroke: 'line',
    strokeWidthMm: 4,
  },
  {
    type: 'rect',
    x: 25,
    y: 82,
    width: 25,
    height: 25,
    fill: 'hazard',
    stroke: 'line',
    strokeWidthMm: 2,
  },
  {
    type: 'rect',
    x: 250,
    y: 193,
    width: 25,
    height: 25,
    fill: 'hazard',
    stroke: 'line',
    strokeWidthMm: 2,
  },
  linePath('M 25 150 L 275 150'),
]);

export const pillarDescriptor = tileDescriptor([
  {
    type: 'rect',
    x: 137.5,
    y: 137.5,
    width: 25,
    height: 25,
    fill: 'structure',
    stroke: 'line',
    strokeWidthMm: 2,
  },
]);

export const seesawDescriptor = tileDescriptor([
  {
    type: 'polygon',
    points: [
      { x: 24, y: 205 },
      { x: 276, y: 95 },
      { x: 276, y: 120 },
      { x: 24, y: 230 },
    ],
    fill: 'structure',
    stroke: 'line',
    strokeWidthMm: 3,
  },
  {
    type: 'polygon',
    points: [
      { x: 132, y: 205 },
      { x: 168, y: 205 },
      { x: 150, y: 235 },
    ],
    fill: 'hazard',
    stroke: 'line',
    strokeWidthMm: 2,
  },
  linePath('M 33 204 L 267 102'),
]);

export const checkpointDescriptor = tileDescriptor([
  {
    type: 'circle',
    centerX: 150,
    centerY: 150,
    radius: 35,
    fill: 'checkpoint',
    stroke: 'line',
    strokeWidthMm: 3,
  },
]);

export const evacuationZoneDescriptor: SvgDescriptor = {
  viewBox: { x: 0, y: 0, width: 1_200, height: 900 },
  primitives: [
    {
      type: 'rect',
      x: 0,
      y: 0,
      width: 1_200,
      height: 900,
      fill: 'tile',
      stroke: 'structure',
      strokeWidthMm: 100,
    },
    {
      type: 'rect',
      x: 0,
      y: 325,
      width: 25,
      height: 250,
      fill: 'silverTape',
      stroke: 'none',
      strokeWidthMm: 0,
    },
    {
      type: 'rect',
      x: 1_175,
      y: 325,
      width: 25,
      height: 250,
      fill: 'line',
      stroke: 'none',
      strokeWidthMm: 0,
    },
  ],
};

export const evacuationEntranceDescriptor = tileDescriptor([
  linePath('M 0 150 L 138 150'),
  {
    type: 'rect',
    x: 137.5,
    y: 25,
    width: 25,
    height: 250,
    fill: 'silverTape',
    stroke: 'none',
    strokeWidthMm: 0,
  },
]);

export const evacuationExitDescriptor = tileDescriptor([
  {
    type: 'rect',
    x: 137.5,
    y: 25,
    width: 25,
    height: 250,
    fill: 'line',
    stroke: 'none',
    strokeWidthMm: 0,
  },
  linePath('M 162 150 L 300 150'),
]);

function safePointDescriptor(paint: 'greenMarker' | 'redMarker'): SvgDescriptor {
  return tileDescriptor(
    [
      {
        type: 'polygon',
        points: [
          { x: 0, y: 300 },
          { x: 300, y: 300 },
          { x: 0, y: 0 },
        ],
        fill: 'none',
        stroke: paint,
        strokeWidthMm: 60,
      },
    ],
    false,
  );
}

export const livingSafePointDescriptor = safePointDescriptor('greenMarker');
export const deadSafePointDescriptor = safePointDescriptor('redMarker');

function victimDescriptor(paint: 'livingVictim' | 'deadVictim'): SvgDescriptor {
  return {
    viewBox: { x: 0, y: 0, width: 50, height: 50 },
    primitives: [
      {
        type: 'circle',
        centerX: 25,
        centerY: 25,
        radius: 22.5,
        fill: paint,
        stroke: 'line',
        strokeWidthMm: 2,
      },
    ],
  };
}

export const livingVictimDescriptor = victimDescriptor('livingVictim');
export const deadVictimDescriptor = victimDescriptor('deadVictim');
