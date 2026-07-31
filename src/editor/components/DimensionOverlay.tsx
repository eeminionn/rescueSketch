import styles from './dimensionOverlay.module.css';

export interface DimensionMeasurement {
  readonly elementId: string;
  readonly xMm: number;
  readonly yMm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly radiiMm: readonly number[];
}

export interface DimensionOverlayProps {
  canvasWidthMm: number;
  canvasHeightMm: number;
  measurements: readonly DimensionMeasurement[];
  selectionIds: readonly string[];
  language: 'es' | 'en';
}

interface DimensionCopy {
  overlayLabel: string;
  canvasLabel: (width: string, height: string) => string;
  elementLabel: (elementId: string, width: string, height: string, radii: string) => string;
  radiiLabel: (radii: string) => string;
}

const dimensionCopy: Readonly<Record<DimensionOverlayProps['language'], DimensionCopy>> = {
  es: {
    overlayLabel: 'Cotas de fabricación',
    canvasLabel: (width, height) => `Lienzo: ${width} de ancho y ${height} de alto`,
    elementLabel: (elementId, width, height, radii) =>
      `Elemento ${elementId}: ${width} de ancho, ${height} de alto${radii}`,
    radiiLabel: (radii) => `, radios ${radii}`,
  },
  en: {
    overlayLabel: 'Fabrication dimensions',
    canvasLabel: (width, height) => `Canvas: ${width} wide and ${height} high`,
    elementLabel: (elementId, width, height, radii) =>
      `Element ${elementId}: ${width} wide, ${height} high${radii}`,
    radiiLabel: (radii) => `, radii ${radii}`,
  },
};

function roundDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const rounded = Number(value.toFixed(2));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatMillimeters(value: number): string {
  return `${String(roundDimension(value))} mm`;
}

function getUniqueRadii(radiiMm: readonly number[]): readonly number[] {
  return [...new Set(radiiMm.map(roundDimension).filter((radius) => radius > 0))].sort(
    (left, right) => left - right,
  );
}

export function DimensionOverlay({
  canvasWidthMm,
  canvasHeightMm,
  measurements,
  selectionIds,
  language,
}: DimensionOverlayProps) {
  const copy = dimensionCopy[language];
  const canvasWidth = Math.max(0, roundDimension(canvasWidthMm));
  const canvasHeight = Math.max(0, roundDimension(canvasHeightMm));
  const smallestCanvasDimension = Math.min(canvasWidth, canvasHeight);
  const globalInset = Math.max(0, Math.min(24, smallestCanvasDimension / 10));
  const globalFontSize = Math.max(12, Math.min(28, smallestCanvasDimension / 35));
  const elementFontSize = Math.max(10, Math.min(18, smallestCanvasDimension / 55));
  const widthLabel = formatMillimeters(canvasWidth);
  const heightLabel = formatMillimeters(canvasHeight);
  const selectedIds = [...new Set(selectionIds)];
  const measurementByElementId = new Map(
    measurements.map((measurement) => [measurement.elementId, measurement]),
  );
  const selectedMeasurements = selectedIds.flatMap((elementId) => {
    const measurement = measurementByElementId.get(elementId);
    return measurement === undefined ? [] : [measurement];
  });
  const canvasAccessibleLabel = copy.canvasLabel(widthLabel, heightLabel);

  return (
    <g
      aria-label={copy.overlayLabel}
      className={styles.dimensionOverlay}
      pointerEvents="none"
      role="group"
    >
      <title>{copy.overlayLabel}</title>

      <g
        aria-label={canvasAccessibleLabel}
        className={styles.globalDimensions}
        data-dimension-scope="canvas"
        role="group"
      >
        <title>{canvasAccessibleLabel}</title>
        <g aria-hidden="true">
          <line
            className={styles.globalLine}
            x1={globalInset}
            x2={canvasWidth - globalInset}
            y1={globalInset}
            y2={globalInset}
          />
          <line
            className={styles.globalTick}
            x1={globalInset}
            x2={globalInset}
            y1={globalInset / 2}
            y2={globalInset * 1.5}
          />
          <line
            className={styles.globalTick}
            x1={canvasWidth - globalInset}
            x2={canvasWidth - globalInset}
            y1={globalInset / 2}
            y2={globalInset * 1.5}
          />
          <text
            className={styles.globalLabel}
            dominantBaseline="middle"
            fontSize={globalFontSize}
            textAnchor="middle"
            x={canvasWidth / 2}
            y={globalInset}
          >
            {widthLabel}
          </text>

          <line
            className={styles.globalLine}
            x1={globalInset}
            x2={globalInset}
            y1={globalInset}
            y2={canvasHeight - globalInset}
          />
          <line
            className={styles.globalTick}
            x1={globalInset / 2}
            x2={globalInset * 1.5}
            y1={globalInset}
            y2={globalInset}
          />
          <line
            className={styles.globalTick}
            x1={globalInset / 2}
            x2={globalInset * 1.5}
            y1={canvasHeight - globalInset}
            y2={canvasHeight - globalInset}
          />
          <text
            className={styles.globalLabel}
            dominantBaseline="middle"
            fontSize={globalFontSize}
            textAnchor="middle"
            transform={`rotate(-90 ${globalInset} ${canvasHeight / 2})`}
            x={globalInset}
            y={canvasHeight / 2}
          >
            {heightLabel}
          </text>
        </g>
      </g>

      {selectedMeasurements.map((measurement) => {
        const width = Math.max(0, roundDimension(measurement.widthMm));
        const height = Math.max(0, roundDimension(measurement.heightMm));
        const widthText = formatMillimeters(width);
        const heightText = formatMillimeters(height);
        const uniqueRadii = getUniqueRadii(measurement.radiiMm);
        const radiiText = uniqueRadii.map(formatMillimeters).join(', ');
        const radiusLabel = uniqueRadii
          .map((radius) => `R ${formatMillimeters(radius)}`)
          .join(' · ');
        const accessibleLabel = copy.elementLabel(
          measurement.elementId,
          widthText,
          heightText,
          radiiText.length === 0 ? '' : copy.radiiLabel(radiiText),
        );
        const horizontalY = measurement.yMm + Math.min(height / 4, elementFontSize * 1.1);
        const verticalX = measurement.xMm + Math.min(width / 4, elementFontSize * 1.1);
        const radiusY = measurement.yMm + height - Math.min(height / 4, elementFontSize * 1.1);

        return (
          <g
            aria-label={accessibleLabel}
            className={styles.selectedDimensions}
            data-dimension-scope="element"
            data-element-id={measurement.elementId}
            key={measurement.elementId}
            role="group"
          >
            <title>{accessibleLabel}</title>
            <g aria-hidden="true">
              <rect
                className={styles.selectionOutline}
                height={height}
                width={width}
                x={measurement.xMm}
                y={measurement.yMm}
              />

              <line
                className={styles.elementLine}
                x1={measurement.xMm}
                x2={measurement.xMm + width}
                y1={horizontalY}
                y2={horizontalY}
              />
              <line
                className={styles.elementTick}
                x1={measurement.xMm}
                x2={measurement.xMm}
                y1={horizontalY - elementFontSize / 2}
                y2={horizontalY + elementFontSize / 2}
              />
              <line
                className={styles.elementTick}
                x1={measurement.xMm + width}
                x2={measurement.xMm + width}
                y1={horizontalY - elementFontSize / 2}
                y2={horizontalY + elementFontSize / 2}
              />
              <text
                className={styles.elementLabel}
                dominantBaseline="middle"
                fontSize={elementFontSize}
                textAnchor="middle"
                x={measurement.xMm + width / 2}
                y={horizontalY}
              >
                {widthText}
              </text>

              <line
                className={styles.elementLine}
                x1={verticalX}
                x2={verticalX}
                y1={measurement.yMm}
                y2={measurement.yMm + height}
              />
              <line
                className={styles.elementTick}
                x1={verticalX - elementFontSize / 2}
                x2={verticalX + elementFontSize / 2}
                y1={measurement.yMm}
                y2={measurement.yMm}
              />
              <line
                className={styles.elementTick}
                x1={verticalX - elementFontSize / 2}
                x2={verticalX + elementFontSize / 2}
                y1={measurement.yMm + height}
                y2={measurement.yMm + height}
              />
              <text
                className={styles.elementLabel}
                dominantBaseline="middle"
                fontSize={elementFontSize}
                textAnchor="middle"
                transform={`rotate(-90 ${verticalX} ${measurement.yMm + height / 2})`}
                x={verticalX}
                y={measurement.yMm + height / 2}
              >
                {heightText}
              </text>

              {radiusLabel.length > 0 ? (
                <text
                  className={styles.radiusLabel}
                  dominantBaseline="middle"
                  fontSize={elementFontSize}
                  textAnchor="middle"
                  x={measurement.xMm + width / 2}
                  y={radiusY}
                >
                  {radiusLabel}
                </text>
              ) : null}
            </g>
          </g>
        );
      })}
    </g>
  );
}
