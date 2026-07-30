import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { rescueSketchI18n, setAppLanguage } from '../../i18n';
import { Dashboard, type DashboardDestination } from './Dashboard';

describe('Dashboard', () => {
  beforeEach(async () => {
    localStorage.clear();
    await setAppLanguage('es');
  });

  it('exposes every daily action in Spanish', () => {
    render(<Dashboard />);

    expect(
      screen.getByRole('heading', {
        name: 'Convierte una idea en una pista que puedas construir.',
      }),
    ).toBeInTheDocument();

    for (const action of [
      'Nueva pista',
      'Mis pistas públicas',
      'Pistas publicadas',
      'Plantillas',
      'Galería',
      'Reglamento',
      'Colaboración',
    ]) {
      expect(screen.getByRole('link', { name: `Abrir ${action}` })).toBeInTheDocument();
    }
  });

  it('switches every visible action to English and persists the choice', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));

    expect(
      screen.getByRole('heading', { name: 'Turn an idea into a track you can build.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open New track' })).toBeInTheDocument();
    expect(localStorage.getItem('rescueSketch.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('provides accessible navigation and a phone view-only explanation', () => {
    render(<Dashboard />);

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByText('Edición disponible en tablet y escritorio')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toHaveAttribute(
      'href',
      '#dashboard-main',
    );
  });

  it('hands destinations to the application router when supplied', async () => {
    const user = userEvent.setup();
    const destinations: DashboardDestination[] = [];

    render(
      <Dashboard
        onNavigate={(destination) => {
          destinations.push(destination);
        }}
      />,
    );

    await user.click(screen.getByRole('link', { name: 'Abrir Nueva pista' }));

    expect(destinations).toEqual(['newTrack']);
  });

  afterAll(async () => {
    await rescueSketchI18n.changeLanguage('es');
  });
});
