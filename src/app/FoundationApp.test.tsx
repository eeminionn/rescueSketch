import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { FoundationApp } from './FoundationApp';

describe('FoundationApp', () => {
  it('shows the RescueSketch foundation in Spanish by default', () => {
    render(<FoundationApp />);

    expect(
      screen.getByRole('heading', { name: 'Imagina la pista. Mídela. Constrúyela.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Base técnica v0.1')).toBeInTheDocument();
  });

  it('switches the visible copy to English', async () => {
    const user = userEvent.setup();
    render(<FoundationApp />);

    await user.click(screen.getByRole('button', { name: 'Cambiar idioma a inglés' }));

    expect(
      screen.getByRole('heading', { name: 'Imagine the track. Measure it. Build it.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Technical foundation v0.1')).toBeInTheDocument();
  });
});
