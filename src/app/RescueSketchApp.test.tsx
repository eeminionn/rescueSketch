import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IDBFactory } from 'fake-indexeddb';

import { rescueSketchI18n, setAppLanguage } from '../i18n';
import { RescueSketchApp } from './RescueSketchApp';

describe('RescueSketchApp', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.location.hash = '#/dashboard';
    vi.stubGlobal('indexedDB', new IDBFactory());
    await setAppLanguage('es');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('routes from the Spanish dashboard to a new measured editor', async () => {
    const user = userEvent.setup();
    render(<RescueSketchApp />);

    expect(
      screen.getByRole('heading', {
        name: 'Convierte una idea en una pista que puedas construir.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Edición disponible en tablet y escritorio')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Abrir Nueva pista' }));

    expect(window.location.hash).toBe('#/editor/new');
    const canvas = await screen.findByRole('img');
    expect(canvas).toHaveAttribute('viewBox', '0 0 2400 1800');
    expect(screen.getByText('2400 × 1800 mm')).toBeInTheDocument();
  });

  it('keeps the selected language while navigating to the editor', async () => {
    const user = userEvent.setup();
    render(<RescueSketchApp />);

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));
    expect(
      screen.getByRole('heading', { name: 'Turn an idea into a track you can build.' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Open New track' }));

    expect(await screen.findByText('Straight line')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('rescueSketch.language')).toBe('en');
  });

  afterAll(async () => {
    await rescueSketchI18n.changeLanguage('es');
  });
});
