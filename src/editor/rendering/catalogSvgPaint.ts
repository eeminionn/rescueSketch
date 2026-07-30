import type { SvgDescriptor } from '../../catalog';

type SvgPrimitive = SvgDescriptor['primitives'][number];
export type SvgPaintToken = SvgPrimitive['fill'];

export const catalogSvgPaintVariables = {
  tile: '--rescueSketchPaintTile',
  line: '--rescueSketchPaintLine',
  greenMarker: '--rescueSketchPaintGreenMarker',
  redMarker: '--rescueSketchPaintRedMarker',
  silverTape: '--rescueSketchPaintSilverTape',
  structure: '--rescueSketchPaintStructure',
  hazard: '--rescueSketchPaintHazard',
  livingVictim: '--rescueSketchPaintLivingVictim',
  deadVictim: '--rescueSketchPaintDeadVictim',
  checkpoint: '--rescueSketchPaintCheckpoint',
} as const satisfies Record<Exclude<SvgPaintToken, 'none'>, `--${string}`>;

const catalogSvgPaintValues = {
  none: 'none',
  tile: `var(${catalogSvgPaintVariables.tile}, #fffef9)`,
  line: `var(${catalogSvgPaintVariables.line}, #10231f)`,
  greenMarker: `var(${catalogSvgPaintVariables.greenMarker}, #2f956a)`,
  redMarker: `var(${catalogSvgPaintVariables.redMarker}, #d5564d)`,
  silverTape: `var(${catalogSvgPaintVariables.silverTape}, #aebbb8)`,
  structure: `var(${catalogSvgPaintVariables.structure}, #687873)`,
  hazard: `var(${catalogSvgPaintVariables.hazard}, #d68a3c)`,
  livingVictim: `var(${catalogSvgPaintVariables.livingVictim}, #e7eeec)`,
  deadVictim: `var(${catalogSvgPaintVariables.deadVictim}, #26302d)`,
  checkpoint: `var(${catalogSvgPaintVariables.checkpoint}, #745fa8)`,
} as const satisfies Record<SvgPaintToken, string>;

export function getCatalogSvgPaintValue(paintToken: SvgPaintToken): string {
  return catalogSvgPaintValues[paintToken];
}
