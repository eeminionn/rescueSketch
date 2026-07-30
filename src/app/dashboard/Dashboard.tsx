import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { rescueSketchI18n, type AppLanguage } from '../../i18n';
import styles from './dashboard.module.css';

export type DashboardDestination =
  'newTrack' | 'myTracks' | 'published' | 'templates' | 'gallery' | 'rules' | 'collaboration';

export interface DashboardProps {
  onNavigate?: (destination: DashboardDestination) => void;
}

type IconName = 'add' | 'archive' | 'book' | 'gallery' | 'github' | 'template' | 'tracks';

interface DashboardAction {
  destination: DashboardDestination;
  href: string;
  icon: IconName;
  labelKey:
    | 'dashboard.createLabel'
    | 'dashboard.libraryLabel'
    | 'dashboard.communityLabel'
    | 'dashboard.referenceLabel';
  isEditorAction?: boolean;
}

const dashboardActions: readonly DashboardAction[] = [
  {
    destination: 'newTrack',
    href: '#/editor/new',
    icon: 'add',
    labelKey: 'dashboard.createLabel',
    isEditorAction: true,
  },
  {
    destination: 'myTracks',
    href: '#/tracks',
    icon: 'tracks',
    labelKey: 'dashboard.libraryLabel',
  },
  {
    destination: 'published',
    href: '#/published',
    icon: 'archive',
    labelKey: 'dashboard.libraryLabel',
  },
  {
    destination: 'templates',
    href: '#/templates',
    icon: 'template',
    labelKey: 'dashboard.libraryLabel',
  },
  {
    destination: 'gallery',
    href: '#/gallery',
    icon: 'gallery',
    labelKey: 'dashboard.communityLabel',
  },
  {
    destination: 'rules',
    href: '#/rules',
    icon: 'book',
    labelKey: 'dashboard.referenceLabel',
  },
  {
    destination: 'collaboration',
    href: 'https://github.com/eeminionn/rescueSketch/issues',
    icon: 'github',
    labelKey: 'dashboard.communityLabel',
  },
];

function DashboardIcon({ name }: { name: IconName }) {
  const iconPaths: Record<IconName, React.ReactNode> = {
    add: (
      <>
        <path d="M12 5v14M5 12h14" />
        <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      </>
    ),
    archive: (
      <>
        <path d="M4 8h16v12H4zM3 4h18v4H3z" />
        <path d="M9 12h6" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23.5zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5a3.5 3.5 0 0 1 3.5 3.5z" />
      </>
    ),
    gallery: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m4 17 4.5-4 3.5 3 2.5-2 5.5 5" />
      </>
    ),
    github: (
      <path d="M12 2.4a9.7 9.7 0 0 0-3.1 18.9c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.8 0-1.1.4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.5 1 2.6 0 3.7-2.3 4.5-4.6 4.8.4.3.7.9.7 1.7v3c0 .3.2.6.7.5A9.7 9.7 0 0 0 12 2.4Z" />
    ),
    template: (
      <>
        <path d="M5 3h11l3 3v15H5z" />
        <path d="M15 3v4h4M8 11h8M8 15h8M8 18h5" />
      </>
    ),
    tracks: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M17.5 14v7M14 17.5h7" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className={styles.actionIcon} fill="none" viewBox="0 0 24 24">
      <g
        fill={name === 'github' ? 'currentColor' : 'none'}
        stroke={name === 'github' ? 'none' : 'currentColor'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {iconPaths[name]}
      </g>
    </svg>
  );
}

function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const activeLanguage: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es';

  const selectLanguage = (language: AppLanguage) => {
    void rescueSketchI18n.changeLanguage(language);
  };

  return (
    <div className={styles.languageSelector} aria-label={t('language.selectorLabel')} role="group">
      <button
        aria-label={t('language.selectSpanish')}
        aria-pressed={activeLanguage === 'es'}
        onClick={() => {
          selectLanguage('es');
        }}
        type="button"
      >
        {t('language.spanishShort')}
      </button>
      <button
        aria-label={t('language.selectEnglish')}
        aria-pressed={activeLanguage === 'en'}
        onClick={() => {
          selectLanguage('en');
        }}
        type="button"
      >
        {t('language.englishShort')}
      </button>
    </div>
  );
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { t } = useTranslation();

  const navigate =
    (destination: DashboardDestination) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (onNavigate !== undefined) {
        event.preventDefault();
        onNavigate(destination);
      }
    };

  return (
    <div className={styles.appShell}>
      <a className={styles.skipLink} href="#dashboard-main">
        {t('shell.skipToContent')}
      </a>

      <header className={styles.header}>
        <a aria-label={t('common.brandName')} className={styles.brand} href="#/dashboard">
          <span aria-hidden="true" className={styles.brandMark}>
            {t('common.brandInitials')}
          </span>
          <span>{t('common.brandName')}</span>
        </a>

        <nav aria-label={t('shell.primaryNavigationLabel')} className={styles.navigation}>
          <a aria-current="page" href="#/dashboard">
            {t('shell.dashboard')}
          </a>
          <a href="#/rules" onClick={navigate('rules')}>
            {t('shell.rules')}
          </a>
          <a
            href="https://github.com/eeminionn/rescueSketch/issues"
            onClick={navigate('collaboration')}
          >
            {t('shell.collaboration')}
          </a>
        </nav>

        <div className={styles.headerTools}>
          <span className={styles.projectStatus} title={t('shell.projectStatusDescription')}>
            <span aria-hidden="true" />
            {t('shell.projectStatus')}
          </span>
          <LanguageSelector />
        </div>
      </header>

      <main className={styles.main} id="dashboard-main">
        <section className={styles.hero} aria-labelledby="dashboard-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t('dashboard.eyebrow')}</p>
            <h1 id="dashboard-title">{t('dashboard.title')}</h1>
            <p className={styles.introduction}>{t('dashboard.introduction')}</p>
            <div className={styles.heroActions}>
              <a
                className={styles.primaryAction}
                href="#/editor/new"
                onClick={navigate('newTrack')}
              >
                <span aria-hidden="true">+</span>
                {t('dashboard.createTrack')}
              </a>
              <a className={styles.secondaryAction} href="#/rules" onClick={navigate('rules')}>
                {t('dashboard.reviewRules')}
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className={styles.trackPreview} aria-hidden="true">
            <div className={styles.previewHeader}>
              <span />
              <span />
              <span />
            </div>
            <div className={styles.previewCanvas}>
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index} />
              ))}
              <svg fill="none" preserveAspectRatio="none" viewBox="0 0 600 360">
                <path d="M0 300h135a55 55 0 0 0 55-55v-80a55 55 0 0 1 55-55h130a55 55 0 0 1 55 55v35a55 55 0 0 0 55 55h115" />
              </svg>
              <i className={styles.previewMarker} />
            </div>
            <div className={styles.previewMeasure}>
              <span />
              <span />
            </div>
          </div>
        </section>

        <aside className={styles.phoneNotice} role="status">
          <span aria-hidden="true" className={styles.phoneNoticeIcon}>
            ↗
          </span>
          <div>
            <strong>{t('dashboard.phoneNoticeTitle')}</strong>
            <p>{t('dashboard.phoneNoticeDescription')}</p>
          </div>
        </aside>

        <section className={styles.actionsSection} aria-labelledby="dashboard-actions-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="dashboard-actions-title">{t('dashboard.actionsTitle')}</h2>
              <p>{t('dashboard.actionsDescription')}</p>
            </div>
            <span className={styles.rulesetPill}>{t('common.rulesetName')}</span>
          </div>

          <div className={styles.actionGrid}>
            {dashboardActions.map((action) => {
              const title = t(`dashboard.actions.${action.destination}.title`);

              return (
                <a
                  aria-label={t('dashboard.openAction', { name: title })}
                  className={`${styles.actionCard} ${
                    action.isEditorAction === true ? styles.editorAction : ''
                  }`}
                  data-destination={action.destination}
                  href={action.href}
                  key={action.destination}
                  onClick={navigate(action.destination)}
                >
                  <div className={styles.actionCardHeader}>
                    <span className={styles.iconFrame}>
                      <DashboardIcon name={action.icon} />
                    </span>
                    <span className={styles.actionLabel}>{t(action.labelKey)}</span>
                  </div>
                  <div className={styles.actionCardCopy}>
                    <h3>{title}</h3>
                    <p>{t(`dashboard.actions.${action.destination}.description`)}</p>
                  </div>
                  <span aria-hidden="true" className={styles.actionArrow}>
                    ↗
                  </span>
                  {action.isEditorAction === true ? (
                    <span className={styles.editorRequirement}>
                      {t('dashboard.editorRequirement')}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </section>

        <section className={styles.recentSection} aria-labelledby="recent-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="recent-title">{t('dashboard.recentTitle')}</h2>
              <p>{t('dashboard.recentDescription')}</p>
            </div>
          </div>
          <div className={styles.emptyState}>
            <div aria-hidden="true" className={styles.emptyIllustration}>
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <h3>{t('dashboard.recentEmptyTitle')}</h3>
              <p>{t('dashboard.recentEmptyDescription')}</p>
            </div>
            <a href="#/editor/new" onClick={navigate('newTrack')}>
              {t('dashboard.recentEmptyAction')}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>{t('footer.notice')}</p>
        <div>
          <a href="#/rules">{t('footer.sourceLabel')}</a>
          <a href="https://github.com/eeminionn/rescueSketch">{t('footer.repositoryLabel')}</a>
        </div>
      </footer>
    </div>
  );
}
