import { useState } from 'react';

import styles from './foundationApp.module.css';

type Language = 'es' | 'en';

const copy = {
  es: {
    badge: 'Base técnica v0.1',
    eyebrow: 'Diseño abierto para Rescue Line',
    languageLabel: 'Cambiar idioma a inglés',
    languageName: 'EN',
    notice:
      'Proyecto comunitario independiente. No está afiliado ni homologado oficialmente por RoboCup.',
    primaryAction: 'Explorar el proyecto',
    secondaryAction: 'Leer las reglas',
    subtitle:
      'Una base bilingüe y medible para convertir ideas de pistas en planos que se puedan construir.',
    title: 'Imagina la pista. Mídela. Constrúyela.',
  },
  en: {
    badge: 'Technical foundation v0.1',
    eyebrow: 'Open design for Rescue Line',
    languageLabel: 'Cambiar idioma a español',
    languageName: 'ES',
    notice:
      'Independent community project. It is not affiliated with or officially approved by RoboCup.',
    primaryAction: 'Explore the project',
    secondaryAction: 'Read the rules',
    subtitle:
      'A bilingual, measurable foundation for turning track ideas into plans that can be built.',
    title: 'Imagine the track. Measure it. Build it.',
  },
} as const satisfies Record<Language, Record<string, string>>;

export function FoundationApp() {
  const [language, setLanguage] = useState<Language>('es');
  const content = copy[language];
  const nextLanguage: Language = language === 'es' ? 'en' : 'es';

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#main-content" aria-label="RescueSketch">
          <span className={styles.brandMark} aria-hidden="true">
            RS
          </span>
          <span>RescueSketch</span>
        </a>
        <button
          className={styles.languageButton}
          type="button"
          aria-label={content.languageLabel}
          onClick={() => {
            setLanguage(nextLanguage);
          }}
        >
          {content.languageName}
        </button>
      </header>

      <section className={styles.hero} id="main-content">
        <div className={styles.content}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className={styles.subtitle}>{content.subtitle}</p>
          <div className={styles.actions} aria-label={language === 'es' ? 'Enlaces' : 'Links'}>
            <a className={styles.primaryAction} href="https://github.com/eeminionn/rescueSketch">
              {content.primaryAction}
            </a>
            <a className={styles.secondaryAction} href="#project-status">
              {content.secondaryAction}
            </a>
          </div>
        </div>

        <aside className={styles.statusCard} id="project-status" aria-label={content.badge}>
          <span className={styles.statusDot} aria-hidden="true" />
          <strong>{content.badge}</strong>
          <div className={styles.tileGrid} aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <p>{content.notice}</p>
        <span>RoboCupJunior Rescue Line 2026</span>
      </footer>
    </main>
  );
}
