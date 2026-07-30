import type { PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';

import { rescueSketchI18n } from './i18n';

export function RescueSketchI18nProvider({ children }: PropsWithChildren) {
  return <I18nextProvider i18n={rescueSketchI18n}>{children}</I18nextProvider>;
}
