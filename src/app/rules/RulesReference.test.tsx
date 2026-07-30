import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RescueSketchI18nProvider, setAppLanguage } from '../../i18n';
import { rescueLine2026Ruleset } from '../../rules';
import { RulesReference } from './RulesReference';

function renderRulesReference() {
  render(
    <RescueSketchI18nProvider>
      <RulesReference onBack={() => undefined} />
    </RescueSketchI18nProvider>,
  );
}

describe('RulesReference', () => {
  beforeEach(async () => {
    await setAppLanguage('es');
  });

  it('renders every traced rule with its declared source revision', () => {
    renderRulesReference();

    expect(
      screen.getByRole('heading', {
        name: 'Medidas claras, siempre con su fuente.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(rescueLine2026Ruleset.source.revision)).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(rescueLine2026Ruleset.entries.length);
  });

  it('filters rules and switches the reference to English', async () => {
    const user = userEvent.setup();
    renderRulesReference();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'gap');

    expect(screen.getByRole('heading', { name: 'Longitud máxima de gap' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ancho nominal de baldosa' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));

    expect(
      screen.getByRole('heading', {
        name: 'Clear measurements, always linked to their source.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maximum gap length' })).toBeInTheDocument();
  });
});
