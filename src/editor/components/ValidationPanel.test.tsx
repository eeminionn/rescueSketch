import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RescueSketchI18nProvider, rescueSketchI18n, setAppLanguage } from '../../i18n';
import type { ValidationFinding, ValidationReport, ValidationSeverity } from '../../validation';
import { ValidationPanel } from './ValidationPanel';

const source = {
  title: 'RoboCupJunior Rescue Line Rules 2026',
  revision: '2026-03-29',
  sha256: 'd1a60d29269245a307b0a0023ebdb3c8bca464a2b7616b0482b5bcee5398d9e6',
  language: 'en' as const,
  url: 'https://junior.robocup.org/rcj-rescue-line/',
};

function createFinding(
  id: string,
  severity: ValidationSeverity,
  elementId: string,
): ValidationFinding {
  return {
    id,
    severity,
    elementId,
    messages: {
      es: `Mensaje ${id}`,
      en: `Message ${id}`,
    },
    rule: {
      ruleId: `line.${id}`,
      section: '3.2.1',
      page: 14,
      source,
      tolerance: 0.1,
      validationMode: severity === 'manual' ? 'manual' : 'automated',
    },
    suggestedCorrection: {
      es: `Corrección ${id}`,
      en: `Correction ${id}`,
    },
  };
}

function createReport(findings: readonly ValidationFinding[]): ValidationReport {
  const summary = {
    errors: findings.filter(({ severity }) => severity === 'error').length,
    warnings: findings.filter(({ severity }) => severity === 'warning').length,
    manualChecks: findings.filter(({ severity }) => severity === 'manual').length,
    information: findings.filter(({ severity }) => severity === 'info').length,
  };

  return {
    rulesetVersion: '2026.1',
    findings: [...findings],
    summary: {
      ...summary,
      isValid: summary.errors === 0,
    },
  };
}

function renderPanel(report: ValidationReport, onSelectElement = vi.fn()) {
  render(
    <RescueSketchI18nProvider>
      <ValidationPanel onSelectElement={onSelectElement} report={report} />
    </RescueSketchI18nProvider>,
  );

  return { onSelectElement };
}

describe('ValidationPanel', () => {
  beforeEach(async () => {
    localStorage.clear();
    await setAppLanguage('es');
  });

  it('summarizes errors, warnings, and manual checks while initially collapsed', () => {
    renderPanel(
      createReport([
        createFinding('lineWidth', 'error', 'tile-1'),
        createFinding('clearance', 'warning', 'tile-2'),
        createFinding('debrisHeight', 'manual', 'tile-3'),
      ]),
    );

    const panel = screen.getByRole('region', { name: 'Validación reglamentaria' });
    const toggle = screen.getByRole('button', { name: /Ver comprobaciones/u });

    expect(panel).toHaveAttribute('data-severity', 'error');
    expect(panel).not.toHaveAttribute('data-expanded');
    expect(screen.getByText('1 error requiere corrección')).toBeInTheDocument();
    expect(screen.getByText('1 error · 1 advertencia · 1 revisión manual')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Mensaje lineWidth')).not.toBeInTheDocument();
  });

  it('expands and collapses the traced findings', async () => {
    const user = userEvent.setup();
    renderPanel(createReport([createFinding('lineWidth', 'error', 'tile-1')]));

    await user.click(screen.getByRole('button', { name: /Ver comprobaciones/u }));

    expect(screen.getByText('Mensaje lineWidth')).toBeInTheDocument();
    expect(screen.getByText('Corrección lineWidth')).toBeInTheDocument();
    expect(screen.getByText('line.lineWidth · § 3.2.1 · p. 14')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ocultar comprobaciones/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /Ocultar comprobaciones/u }));

    expect(screen.queryByText('Mensaje lineWidth')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver comprobaciones/u })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('updates all visible finding content when the application language changes', async () => {
    const user = userEvent.setup();
    renderPanel(createReport([createFinding('lineWidth', 'error', 'tile-1')]));

    await user.click(screen.getByRole('button', { name: /Ver comprobaciones/u }));
    await setAppLanguage('en');

    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Rules validation' })).toBeInTheDocument();
    });
    expect(screen.getByText('1 error needs correction')).toBeInTheDocument();
    expect(screen.getByText('Message lineWidth')).toBeInTheDocument();
    expect(screen.getByText('Correction lineWidth')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Locate' })).toBeInTheDocument();
  });

  it('locates selectable elements but omits the action for track and canvas findings', async () => {
    const user = userEvent.setup();
    const { onSelectElement } = renderPanel(
      createReport([
        createFinding('trackCount', 'error', 'track'),
        createFinding('canvasSize', 'warning', 'canvas'),
        createFinding('lineWidth', 'error', 'tile-1'),
      ]),
    );

    await user.click(screen.getByRole('button', { name: /Ver comprobaciones/u }));

    const trackFinding = screen.getByText('Mensaje trackCount').closest('article');
    const canvasFinding = screen.getByText('Mensaje canvasSize').closest('article');

    expect(trackFinding).not.toBeNull();
    expect(canvasFinding).not.toBeNull();
    expect(
      within(trackFinding as HTMLElement).queryByRole('button', { name: 'Ubicar' }),
    ).not.toBeInTheDocument();
    expect(
      within(canvasFinding as HTMLElement).queryByRole('button', { name: 'Ubicar' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ubicar' }));

    expect(onSelectElement).toHaveBeenCalledOnce();
    expect(onSelectElement).toHaveBeenCalledWith('tile-1');
  });

  afterAll(async () => {
    await rescueSketchI18n.changeLanguage('es');
  });
});
