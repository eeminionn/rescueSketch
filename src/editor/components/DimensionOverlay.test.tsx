import { render, screen } from '@testing-library/react';

import { DimensionOverlay, type DimensionMeasurement } from './DimensionOverlay';

const measurements: readonly DimensionMeasurement[] = [
  {
    elementId: 'curve-1',
    xMm: 300,
    yMm: 600,
    widthMm: 300,
    heightMm: 300,
    radiiMm: [75, 50, 75, 50.004],
  },
  {
    elementId: 'line-2',
    xMm: 600,
    yMm: 600,
    widthMm: 300,
    heightMm: 300,
    radiiMm: [],
  },
];

function renderOverlay(properties: Partial<React.ComponentProps<typeof DimensionOverlay>> = {}) {
  const result = render(
    <svg viewBox="0 0 2400 1800">
      <DimensionOverlay
        canvasHeightMm={1800}
        canvasWidthMm={2400.456}
        language="es"
        measurements={measurements}
        selectionIds={[]}
        {...properties}
      />
    </svg>,
  );

  return result.container;
}

function getVisibleMeasurementText(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll('text')].map((element) => element.textContent ?? '');
}

describe('DimensionOverlay', () => {
  it('renders accessible global dimensions inside the SVG with deterministic millimeters', () => {
    const container = renderOverlay();

    expect(screen.getByRole('group', { name: 'Cotas de fabricación' })).toHaveAttribute(
      'pointer-events',
      'none',
    );
    expect(
      screen.getByRole('group', {
        name: 'Lienzo: 2400.46 mm de ancho y 1800 mm de alto',
      }),
    ).toBeInTheDocument();
    expect(getVisibleMeasurementText(container)).toEqual(['2400.46 mm', '1800 mm']);
  });

  it('renders dimensions only for selected elements and lists unique sorted radii', () => {
    const container = renderOverlay({ selectionIds: ['curve-1', 'curve-1', 'missing'] });

    expect(
      screen.getByRole('group', {
        name: 'Elemento curve-1: 300 mm de ancho, 300 mm de alto, radios 50 mm, 75 mm',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /line-2/u })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-element-id="curve-1"]')).toHaveLength(1);
    expect(getVisibleMeasurementText(container)).toContain('R 50 mm · R 75 mm');
  });

  it('uses concise English accessibility text from the language prop', () => {
    renderOverlay({
      canvasHeightMm: 1800.5,
      canvasWidthMm: 2400,
      language: 'en',
      selectionIds: ['line-2'],
    });

    expect(screen.getByRole('group', { name: 'Fabrication dimensions' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: 'Canvas: 2400 mm wide and 1800.5 mm high',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: 'Element line-2: 300 mm wide, 300 mm high',
      }),
    ).toBeInTheDocument();
  });
});
