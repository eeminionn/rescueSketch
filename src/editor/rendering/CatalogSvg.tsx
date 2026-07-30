import { useId, type ReactElement } from 'react';

import type { SvgDescriptor } from '../../catalog';
import { getCatalogSvgPaintValue } from './catalogSvgPaint';
import styles from './catalogSvg.module.css';

type SvgPrimitive = SvgDescriptor['primitives'][number];

export interface CatalogSvgProps {
  descriptor: SvgDescriptor;
  title?: string;
  className?: string;
  selected?: boolean;
  decorative?: boolean;
  sizing?: CatalogSvgSizing;
}

export type CatalogSvgSizing = 'container' | 'intrinsic';

interface PrimitivePaintProps {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

function getPrimitivePaintProps(primitive: SvgPrimitive): PrimitivePaintProps {
  return {
    fill: getCatalogSvgPaintValue(primitive.fill),
    stroke: getCatalogSvgPaintValue(primitive.stroke),
    strokeWidth: primitive.strokeWidthMm,
  };
}

function renderPrimitive(primitive: SvgPrimitive, index: number): ReactElement {
  const paintProps = getPrimitivePaintProps(primitive);
  const key = `${primitive.type}-${index}`;

  switch (primitive.type) {
    case 'path':
      return (
        <path
          {...paintProps}
          d={primitive.d}
          key={key}
          strokeLinecap={primitive.lineCap}
          strokeLinejoin={primitive.lineJoin}
        />
      );
    case 'rect':
      return (
        <rect
          {...paintProps}
          height={primitive.height}
          key={key}
          rx={primitive.radius}
          ry={primitive.radius}
          width={primitive.width}
          x={primitive.x}
          y={primitive.y}
        />
      );
    case 'circle':
      return (
        <circle
          {...paintProps}
          cx={primitive.centerX}
          cy={primitive.centerY}
          key={key}
          r={primitive.radius}
        />
      );
    case 'polygon':
      return (
        <polygon
          {...paintProps}
          key={key}
          points={primitive.points.map(({ x, y }) => `${x},${y}`).join(' ')}
        />
      );
  }
}

export function CatalogSvg({
  descriptor,
  title,
  className,
  selected = false,
  decorative,
  sizing = 'container',
}: CatalogSvgProps) {
  const titleId = useId();
  const normalizedTitle = title?.trim();
  const hasTitle = Boolean(normalizedTitle);
  const isDecorative = decorative ?? !hasTitle;
  const { viewBox } = descriptor;
  const classes = [styles.catalogSvg, className].filter(Boolean).join(' ');

  return (
    <svg
      aria-hidden={isDecorative ? 'true' : undefined}
      aria-labelledby={!isDecorative && hasTitle ? titleId : undefined}
      className={classes}
      data-height-mm={viewBox.height}
      data-selected={selected ? 'true' : 'false'}
      data-sizing={sizing}
      data-width-mm={viewBox.width}
      focusable="false"
      height={sizing === 'intrinsic' ? viewBox.height : undefined}
      preserveAspectRatio="xMidYMid meet"
      role={isDecorative ? undefined : 'img'}
      shapeRendering="geometricPrecision"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      width={sizing === 'intrinsic' ? viewBox.width : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
      {!isDecorative && hasTitle ? <title id={titleId}>{normalizedTitle}</title> : null}
      {descriptor.primitives.map(renderPrimitive)}
    </svg>
  );
}
