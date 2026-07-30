import { render, screen } from '@testing-library/react';

import type { SvgDescriptor } from '../../catalog';
import { CatalogSvg } from './CatalogSvg';
import { catalogSvgPaintVariables } from './catalogSvgPaint';

const descriptor: SvgDescriptor = {
  viewBox: {
    x: -10,
    y: 20,
    width: 300,
    height: 450,
  },
  primitives: [
    {
      type: 'path',
      d: 'M 0 0 L 10 10',
      fill: 'none',
      stroke: 'line',
      strokeWidthMm: 15,
      lineCap: 'round',
      lineJoin: 'bevel',
    },
    {
      type: 'rect',
      x: 20,
      y: 30,
      width: 40,
      height: 50,
      radius: 4,
      fill: 'tile',
      stroke: 'structure',
      strokeWidthMm: 2,
    },
    {
      type: 'circle',
      centerX: 100,
      centerY: 120,
      radius: 25,
      fill: 'livingVictim',
      stroke: 'deadVictim',
      strokeWidthMm: 3,
    },
    {
      type: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 15, y: 30 },
      ],
      fill: 'greenMarker',
      stroke: 'redMarker',
      strokeWidthMm: 1,
    },
  ],
};

describe('CatalogSvg', () => {
  it('preserves the descriptor coordinate system and exposes its physical dimensions', () => {
    render(<CatalogSvg className="consumerClass" descriptor={descriptor} title="Track piece" />);

    const svg = screen.getByRole('img', { name: 'Track piece' });

    expect(svg).toHaveAttribute('viewBox', '-10 20 300 450');
    expect(svg).toHaveAttribute('data-width-mm', '300');
    expect(svg).toHaveAttribute('data-height-mm', '450');
    expect(svg).toHaveAttribute('data-sizing', 'container');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
    expect(svg).toHaveClass('consumerClass');
  });

  it('uses descriptor dimensions when nested intrinsically in the main SVG canvas', () => {
    render(
      <svg aria-label="Editor canvas">
        <CatalogSvg descriptor={descriptor} sizing="intrinsic" title="Placed track piece" />
      </svg>,
    );

    const placedPiece = screen.getByRole('img', { name: 'Placed track piece' });

    expect(placedPiece).toHaveAttribute('data-sizing', 'intrinsic');
    expect(placedPiece).toHaveAttribute('width', '300');
    expect(placedPiece).toHaveAttribute('height', '450');
    expect(placedPiece).toHaveAttribute('viewBox', '-10 20 300 450');
  });

  it('renders every safe primitive without interpreting markup', () => {
    const { container } = render(<CatalogSvg descriptor={descriptor} decorative />);

    const path = container.querySelector('path');
    const rect = container.querySelector('rect');
    const circle = container.querySelector('circle');
    const polygon = container.querySelector('polygon');

    expect(path).toHaveAttribute('d', 'M 0 0 L 10 10');
    expect(path).toHaveAttribute('fill', 'none');
    expect(path).toHaveAttribute('stroke', `var(${catalogSvgPaintVariables.line}, #10231f)`);
    expect(path).toHaveAttribute('stroke-width', '15');
    expect(path).toHaveAttribute('stroke-linecap', 'round');
    expect(path).toHaveAttribute('stroke-linejoin', 'bevel');

    expect(rect).toHaveAttribute('x', '20');
    expect(rect).toHaveAttribute('y', '30');
    expect(rect).toHaveAttribute('width', '40');
    expect(rect).toHaveAttribute('height', '50');
    expect(rect).toHaveAttribute('rx', '4');
    expect(rect).toHaveAttribute('ry', '4');
    expect(rect).toHaveAttribute('fill', `var(${catalogSvgPaintVariables.tile}, #fffef9)`);

    expect(circle).toHaveAttribute('cx', '100');
    expect(circle).toHaveAttribute('cy', '120');
    expect(circle).toHaveAttribute('r', '25');

    expect(polygon).toHaveAttribute('points', '0,0 30,0 15,30');
    expect(polygon).toHaveAttribute(
      'fill',
      `var(${catalogSvgPaintVariables.greenMarker}, #2f956a)`,
    );
  });

  it('is hidden from assistive technology when decorative or unnamed by default', () => {
    const { rerender } = render(
      <CatalogSvg descriptor={descriptor} decorative title="Ignored title" />,
    );
    const svg = document.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg?.querySelector('title')).not.toBeInTheDocument();

    rerender(<CatalogSvg descriptor={descriptor} />);

    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes selected state for theme styling without changing image semantics', () => {
    const { rerender } = render(
      <CatalogSvg descriptor={descriptor} selected title="Selected track piece" />,
    );
    const svg = screen.getByRole('img', { name: 'Selected track piece' });

    expect(svg).toHaveAttribute('data-selected', 'true');
    expect(svg).not.toHaveAttribute('aria-selected');

    rerender(<CatalogSvg descriptor={descriptor} title="Track piece" />);

    expect(screen.getByRole('img', { name: 'Track piece' })).toHaveAttribute(
      'data-selected',
      'false',
    );
  });
});
