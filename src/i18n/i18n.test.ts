import {
  createRescueSketchI18n,
  languageStorageKey,
  normalizeLanguage,
  resolveInitialLanguage,
} from './i18n';
import { translationCatalogs } from './catalogs';

function listLeafKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`;

    return typeof child === 'object' && child !== null ? listLeafKeys(child, path) : [path];
  });
}

describe('RescueSketch i18n', () => {
  it('keeps the Spanish and English catalogs structurally complete', () => {
    expect(listLeafKeys(translationCatalogs.es.translation)).toEqual(
      listLeafKeys(translationCatalogs.en.translation),
    );
  });

  it('prefers a stored language over the browser language', () => {
    const storage = {
      getItem: (key: string) => (key === languageStorageKey ? 'en' : null),
    };

    expect(resolveInitialLanguage(storage, ['es-CL'])).toBe('en');
  });

  it('normalizes regional locales and falls back to Spanish', () => {
    expect(normalizeLanguage('EN-us')).toBe('en');
    expect(normalizeLanguage('pt-BR')).toBeNull();
    expect(resolveInitialLanguage(null, ['pt-BR'])).toBe('es');
  });

  it('persists language changes and updates the document locale', async () => {
    localStorage.clear();
    const instance = createRescueSketchI18n('es');

    await instance.changeLanguage('en');

    expect(localStorage.getItem(languageStorageKey)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
