import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { supportedLanguages, translationCatalogs, type AppLanguage } from './catalogs';

export const languageStorageKey = 'rescueSketch.language';
export const defaultLanguage: AppLanguage = 'es';

type ReadableStorage = Pick<Storage, 'getItem'>;

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isAppLanguage(language: string): language is AppLanguage {
  return supportedLanguages.includes(language as AppLanguage);
}

export function normalizeLanguage(language: string | null | undefined): AppLanguage | null {
  const baseLanguage = language?.trim().toLowerCase().split('-')[0];

  return baseLanguage !== undefined && isAppLanguage(baseLanguage) ? baseLanguage : null;
}

export function resolveInitialLanguage(
  storage: ReadableStorage | null = getBrowserStorage(),
  _browserLanguages: readonly string[] = typeof navigator === 'undefined'
    ? []
    : navigator.languages,
): AppLanguage {
  void _browserLanguages;
  try {
    const storedLanguage = normalizeLanguage(storage?.getItem(languageStorageKey));

    if (storedLanguage !== null) {
      return storedLanguage;
    }
  } catch {
    // A blocked storage API must not prevent RescueSketch from starting.
  }

  return defaultLanguage;
}

function persistLanguage(language: string): void {
  const normalizedLanguage = normalizeLanguage(language) ?? defaultLanguage;

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizedLanguage;
  }

  try {
    getBrowserStorage()?.setItem(languageStorageKey, normalizedLanguage);
  } catch {
    // Language selection remains usable when persistence is unavailable.
  }
}

export function createRescueSketchI18n(initialLanguage = resolveInitialLanguage()): I18nInstance {
  const instance = i18next.createInstance();

  void instance.use(initReactI18next).init({
    resources: translationCatalogs,
    lng: initialLanguage,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

  instance.on('languageChanged', persistLanguage);
  persistLanguage(initialLanguage);

  return instance;
}

export const rescueSketchI18n = createRescueSketchI18n();

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await rescueSketchI18n.changeLanguage(language);
}
