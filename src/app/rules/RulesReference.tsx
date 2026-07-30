import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { rescueSketchI18n, type AppLanguage } from '../../i18n';
import { rescueLine2026Ruleset } from '../../rules';
import styles from './rulesReference.module.css';

export interface RulesReferenceProps {
  onBack: () => void;
}

function formatRuleValue(
  value: string | number | boolean,
  unit: string,
  translatedUnit: string,
): string {
  const formattedValue = typeof value === 'boolean' ? (value ? '✓' : '—') : String(value);
  return unit === 'none' ? formattedValue : `${formattedValue} ${translatedUnit}`;
}

export function RulesReference({ onBack }: RulesReferenceProps) {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es';
  const [query, setQuery] = useState('');
  const [validationFilter, setValidationFilter] = useState<'all' | 'automated' | 'manual'>('all');
  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language);

    return rescueLine2026Ruleset.entries.filter(
      (entry) =>
        (validationFilter === 'all' || entry.validationMode === validationFilter) &&
        (normalizedQuery.length === 0 ||
          entry.title[language].toLocaleLowerCase(language).includes(normalizedQuery) ||
          entry.description[language].toLocaleLowerCase(language).includes(normalizedQuery) ||
          entry.id.toLocaleLowerCase(language).includes(normalizedQuery)),
    );
  }, [language, query, validationFilter]);

  return (
    <div className={styles.rulesRoot}>
      <header className={styles.header}>
        <button aria-label={t('common.backToDashboard')} onClick={onBack} type="button">
          <span aria-hidden="true">{t('common.brandInitials')}</span>
          <strong>{t('common.brandName')}</strong>
        </button>
        <nav aria-label={t('shell.primaryNavigationLabel')}>
          <a href="#/dashboard" onClick={onBack}>
            {t('shell.dashboard')}
          </a>
          <a aria-current="page" href="#/rules">
            {t('shell.rules')}
          </a>
          <a href="https://github.com/eeminionn/rescueSketch/issues">{t('shell.collaboration')}</a>
        </nav>
        <div aria-label={t('language.selectorLabel')} role="group">
          {(['es', 'en'] as const).map((candidate) => (
            <button
              aria-label={
                candidate === 'es' ? t('language.selectSpanish') : t('language.selectEnglish')
              }
              aria-pressed={language === candidate}
              key={candidate}
              onClick={() => {
                void rescueSketchI18n.changeLanguage(candidate);
              }}
              type="button"
            >
              {candidate.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div>
            <p>{t('rules.eyebrow')}</p>
            <h1>{t('rules.title')}</h1>
            <p>{t('rules.introduction')}</p>
          </div>
          <aside>
            <span>{t('rules.sourceRevision')}</span>
            <strong>{rescueLine2026Ruleset.source.revision}</strong>
            <a href={rescueLine2026Ruleset.source.url}>{t('rules.openSource')}</a>
          </aside>
        </section>

        <aside className={styles.disclaimer}>
          <span aria-hidden="true">!</span>
          <div>
            <strong>{t('rules.disclaimerTitle')}</strong>
            <p>{rescueLine2026Ruleset.disclaimer[language]}</p>
          </div>
        </aside>

        <section aria-labelledby="rules-list-title" className={styles.referenceSection}>
          <div className={styles.referenceHeading}>
            <div>
              <h2 id="rules-list-title">{t('rules.referenceTitle')}</h2>
              <p>
                {t('rules.referenceDescription', { count: rescueLine2026Ruleset.entries.length })}
              </p>
            </div>
            <div className={styles.filters}>
              <label>
                <span>{t('rules.searchLabel')}</span>
                <input
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                  }}
                  placeholder={t('rules.searchPlaceholder')}
                  type="search"
                  value={query}
                />
              </label>
              <label>
                <span>{t('rules.validationFilterLabel')}</span>
                <select
                  onChange={(event) => {
                    setValidationFilter(
                      event.currentTarget.value as 'all' | 'automated' | 'manual',
                    );
                  }}
                  value={validationFilter}
                >
                  <option value="all">{t('rules.validationFilters.all')}</option>
                  <option value="automated">{t('rules.validationFilters.automated')}</option>
                  <option value="manual">{t('rules.validationFilters.manual')}</option>
                </select>
              </label>
            </div>
          </div>

          <div className={styles.ruleGrid}>
            {entries.map((entry) => (
              <article key={entry.id}>
                <div className={styles.ruleCardHeader}>
                  <span>{entry.id}</span>
                  <em data-mode={entry.validationMode}>
                    {t(`rules.validationModes.${entry.validationMode}`)}
                  </em>
                </div>
                <h3>{entry.title[language]}</h3>
                <p>{entry.description[language]}</p>
                <dl>
                  <div>
                    <dt>{t('rules.valueLabel')}</dt>
                    <dd>
                      {formatRuleValue(
                        entry.value,
                        entry.unit,
                        t(`units.${entry.unit}`, { defaultValue: entry.unit }),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('rules.referenceLabel')}</dt>
                    <dd>
                      § {entry.section} · {t('common.pageAbbreviation')} {entry.page}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('rules.toleranceLabel')}</dt>
                    <dd>
                      {entry.tolerance === null
                        ? t('rules.notApplicable')
                        : `±${entry.tolerance * 100}%`}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {entries.length === 0 ? <p className={styles.empty}>{t('rules.noResults')}</p> : null}
        </section>
      </main>
    </div>
  );
}
