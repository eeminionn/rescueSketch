import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';

import { createEmptyTrackDocument } from '../../domain';
import { RescueSketchI18nProvider, rescueSketchI18n, setAppLanguage } from '../../i18n';
import { EditorWorkspace } from './EditorWorkspace';

const acceptedAt = '2026-07-30T18:00:00-04:00';

function renderEditor() {
  const onExit = vi.fn();

  render(
    <RescueSketchI18nProvider>
      <EditorWorkspace
        initialDocument={createEmptyTrackDocument(acceptedAt)}
        onExit={onExit}
        trackId="integration-track"
      />
    </RescueSketchI18nProvider>,
  );

  return { onExit };
}

function getCatalogPanel(): HTMLElement {
  const panel = document.querySelector('main aside');

  if (!(panel instanceof HTMLElement)) {
    throw new Error('The catalog panel was not rendered.');
  }

  return panel;
}

function getAddButton(itemName: string): HTMLButtonElement {
  const button = within(getCatalogPanel())
    .getAllByRole('button', { name: new RegExp(itemName, 'iu') })
    .find((candidate) => candidate.textContent?.trim() === '+');

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`The keyboard add button for "${itemName}" was not rendered.`);
  }

  return button;
}

function getCanvasElement(): SVGGElement | null {
  return document.querySelector('svg[role="img"] g[role="button"]');
}

describe('EditorWorkspace', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.stubGlobal('indexedDB', new IDBFactory());
    await setAppLanguage('es');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the nominal 8 × 6 tile canvas and keeps the inspector closed', () => {
    renderEditor();

    const canvas = screen.getByRole('img');

    expect(canvas).toHaveAttribute('viewBox', '0 0 2400 1800');
    expect(canvas).toHaveAttribute('width', '2400');
    expect(canvas).toHaveAttribute('height', '1800');
    expect(screen.getByText('2400 × 1800 mm')).toBeInTheDocument();
    expect(document.querySelector('aside[class*="inspector"]')).not.toBeInTheDocument();
  });

  it('offers a keyboard-operable insertion button and a contextual inspector', async () => {
    const user = userEvent.setup();
    renderEditor();

    const addStraightLine = getAddButton('Línea recta');
    addStraightLine.focus();
    await user.keyboard('{Enter}');

    expect(getCanvasElement()).toHaveAttribute('data-selected', 'true');
    expect(document.querySelector('aside[class*="inspector"]')).not.toBeInTheDocument();

    const inspectorToggle = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.trim() === 'ⓘ');

    if (!(inspectorToggle instanceof HTMLButtonElement)) {
      throw new Error('The inspector toggle was not rendered.');
    }

    await user.click(inspectorToggle);

    const inspector = document.querySelector('aside[class*="inspector"]');
    expect(inspector).toBeInTheDocument();
    expect(within(inspector as HTMLElement).getByText('Línea recta')).toBeInTheDocument();
    expect(
      within(inspector as HTMLElement).getByText(
        'Marca los centros de ambos bordes antes de tender la cinta.',
      ),
    ).toBeInTheDocument();
  });

  it('supports rotate, delete, undo, and redo through visible controls', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(getAddButton('Línea recta'));
    expect(getCanvasElement()?.getAttribute('transform')).toContain('rotate(0)');

    await user.click(screen.getByRole('button', { name: 'Rotar 90 grados' }));
    expect(getCanvasElement()?.getAttribute('transform')).toContain('rotate(90)');

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(getCanvasElement()).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getCanvasElement()?.getAttribute('transform')).toContain('rotate(90)');

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(getCanvasElement()?.getAttribute('transform')).toContain('rotate(0)');

    await user.click(screen.getByRole('button', { name: 'Rehacer' }));
    expect(getCanvasElement()?.getAttribute('transform')).toContain('rotate(90)');
  });

  it('shows derived dimensions and the construction report without persisting them', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(getAddButton('Línea recta'));
    await user.click(screen.getByRole('button', { name: 'Mostrar u ocultar cotas' }));

    expect(screen.getByRole('group', { name: 'Cotas de fabricación' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', {
        name: /Elemento straightLine-.+: 300 mm de ancho, 300 mm de alto/u,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Mostrar u ocultar informe de fabricación' }),
    );

    const fabricationPanel = screen.getByRole('complementary', { name: 'Fabricación' });
    const fabricationSummary = within(fabricationPanel).getByRole('region', {
      name: 'Resumen de la pista',
    });
    expect(within(fabricationSummary).getByText('300 mm')).toBeInTheDocument();
    expect(within(fabricationPanel).getByText('Línea recta')).toBeInTheDocument();
    expect(within(fabricationPanel).getByText('× 1')).toBeInTheDocument();
  });

  it('offers canonical JSON, physical SVG, and PNG export actions', async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Abrir opciones de exportación' }));

    expect(screen.getByRole('menu', { name: 'Exportar pista' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Descargar JSON' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Descargar SVG' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Descargar PNG' })).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Descargar PDF de fabricación' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Descargar DXF R2000' })).toBeInTheDocument();
  });

  it('updates the editor and catalog from Spanish to English', async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(within(getCatalogPanel()).getByText('Línea recta')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));

    expect(within(getCatalogPanel()).getByText('Straight line')).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en');
    });
    expect(localStorage.getItem('rescueSketch.language')).toBe('en');
  });

  afterAll(async () => {
    await rescueSketchI18n.changeLanguage('es');
  });
});
