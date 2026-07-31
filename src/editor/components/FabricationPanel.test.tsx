import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { fabricationReportVersion, type FabricationReport } from '../../fabrication';
import { RescueSketchI18nProvider, rescueSketchI18n, setAppLanguage } from '../../i18n';
import { FabricationPanel } from './FabricationPanel';

const report: FabricationReport = {
  reportVersion: fabricationReportVersion,
  source: {
    schemaVersion: '1.0.0',
    rulesetVersion: '2026.1',
    catalogVersion: '2026.1',
  },
  wasteRatio: 0.1,
  summary: {
    canvas: {
      widthMm: 2400.5,
      heightMm: 1800,
      areaSquareMm: 4_320_900,
      tileSizeMm: 300,
      gridSizeMm: 25,
      levelCount: 2,
    },
    elements: {
      total: 5,
      tileCount: 3,
      structureCount: 2,
      totalLineLengthMm: 1234.5,
      uniqueRadiiMm: [150],
    },
  },
  measurements: [],
  tapeRequirements: [
    {
      color: 'black',
      widthMm: 15,
      netLengthMm: 1234.5,
      purchaseLengthMm: 1357.95,
      wasteRatio: 0.1,
      sourceElementIds: ['line-1', 'curve-1'],
    },
    {
      color: 'red',
      widthMm: 25,
      netLengthMm: 300,
      purchaseLengthMm: 330,
      wasteRatio: 0.1,
      sourceElementIds: ['goal-1'],
    },
  ],
  inventory: {
    items: [
      {
        group: 'piece',
        catalogItemId: 'straightLine',
        names: {
          es: 'Línea recta',
          en: 'Straight line',
        },
        quantity: 2,
        sourceElementIds: ['line-1', 'line-2'],
      },
      {
        group: 'hazard',
        catalogItemId: 'obstacle',
        names: {
          es: 'Obstáculo',
          en: 'Obstacle',
        },
        quantity: 1,
        sourceElementIds: ['obstacle-1'],
      },
    ],
    materials: [
      {
        materialId: 'evacuationWall',
        unit: 'linearMm',
        quantity: 1,
        netLengthMm: 4200,
        specification: {
          heightMm: 100,
        },
        sourceElementIds: ['evacuation-zone-1'],
      },
      {
        materialId: 'bridgePillar',
        unit: 'piece',
        quantity: 4,
        netLengthMm: 0,
        specification: {
          maximumWidthMm: 25,
        },
        sourceElementIds: ['bridge-1'],
      },
    ],
  },
};

function renderPanel(properties: Partial<React.ComponentProps<typeof FabricationPanel>> = {}) {
  const onClose = vi.fn();
  const onWasteRatioChange = vi.fn();

  render(
    <RescueSketchI18nProvider>
      <FabricationPanel
        language="es"
        onClose={onClose}
        onWasteRatioChange={onWasteRatioChange}
        report={report}
        {...properties}
      />
    </RescueSketchI18nProvider>,
  );

  return { onClose, onWasteRatioChange };
}

describe('FabricationPanel', () => {
  beforeEach(async () => {
    localStorage.clear();
    await setAppLanguage('es');
  });

  it('shows the Spanish summary and separates tape requirements by colour and width', () => {
    renderPanel();

    expect(screen.getByRole('complementary', { name: 'Fabricación' })).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Resumen de la pista' });

    expect(within(summary).getByText('2400,5 mm × 1800 mm')).toBeInTheDocument();
    expect(within(summary).getByText('3')).toBeInTheDocument();
    expect(within(summary).getByText('2')).toBeInTheDocument();
    expect(within(summary).getByText('1234,5 mm')).toBeInTheDocument();

    const blackTapeRow = screen.getByRole('row', {
      name: 'Negra 15 mm 1234,5 mm 1357,95 mm',
    });
    const redTapeRow = screen.getByRole('row', {
      name: 'Roja 25 mm 300 mm 330 mm',
    });

    expect(within(blackTapeRow).getByText('Negra')).toBeInTheDocument();
    expect(within(redTapeRow).getByText('Roja')).toBeInTheDocument();
  });

  it('lists grouped pieces and derived construction materials', () => {
    renderPanel();

    expect(screen.getByText('Línea recta')).toBeInTheDocument();
    expect(screen.getByText('Obstáculo')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad: 2')).toHaveTextContent('× 2');
    expect(screen.getByText('Muros de evacuación')).toBeInTheDocument();
    expect(screen.getByText('4200 mm')).toBeInTheDocument();
    expect(screen.getByText('Pilares de puente')).toBeInTheDocument();
    expect(screen.getByText('× 4')).toBeInTheDocument();
    expect(
      screen.getByText('Se recalculan desde la geometría y no se duplican en el archivo JSON.'),
    ).toBeInTheDocument();
  });

  it('renders English labels, names, and locale-aware measurements', async () => {
    await setAppLanguage('en');
    renderPanel({ language: 'en' });

    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: 'Fabrication' })).toBeInTheDocument();
    });
    expect(screen.getByText('2,400.5 mm × 1,800 mm')).toBeInTheDocument();
    expect(screen.getByText('Straight line')).toBeInTheDocument();
    expect(screen.getByText('Obstacle')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Purchase length' })).toBeInTheDocument();
    expect(
      screen.getByRole('row', {
        name: 'Black 15 mm 1,234.5 mm 1,357.95 mm',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Evacuation walls')).toBeInTheDocument();
  });

  it('reports the selected waste allowance as a ratio', () => {
    const { onWasteRatioChange } = renderPanel();
    const input = screen.getByRole('spinbutton', { name: /Margen de merma/u });

    expect(input).toHaveValue(10);

    fireEvent.change(input, { target: { value: '25' } });

    expect(onWasteRatioChange).toHaveBeenCalledOnce();
    expect(onWasteRatioChange).toHaveBeenCalledWith(0.25);
  });

  afterAll(async () => {
    await rescueSketchI18n.changeLanguage('es');
  });
});
