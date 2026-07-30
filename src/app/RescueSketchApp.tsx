import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EditorWorkspace } from '../editor/components';
import { RescueSketchI18nProvider } from '../i18n';
import { Dashboard, type DashboardDestination } from './dashboard';
import { RulesReference } from './rules';
import styles from './rescueSketchApp.module.css';

type AppRoute = 'dashboard' | 'editor' | 'rules' | DashboardDestination;

function parseRoute(hash: string): AppRoute {
  if (hash.startsWith('#/editor')) {
    return 'editor';
  }

  if (hash.startsWith('#/rules')) {
    return 'rules';
  }

  const routeByHash: Readonly<Record<string, AppRoute>> = {
    '#/tracks': 'myTracks',
    '#/published': 'published',
    '#/templates': 'templates',
    '#/gallery': 'gallery',
  };

  return routeByHash[hash] ?? 'dashboard';
}

function routeHash(route: AppRoute): string {
  const hashByRoute: Partial<Record<AppRoute, string>> = {
    dashboard: '#/dashboard',
    editor: '#/editor/new',
    rules: '#/rules',
    myTracks: '#/tracks',
    published: '#/published',
    templates: '#/templates',
    gallery: '#/gallery',
  };

  return hashByRoute[route] ?? '#/dashboard';
}

function PlaceholderView({
  destination,
  onBack,
}: {
  destination: DashboardDestination;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const destinationTitle = t(`dashboard.actions.${destination}.title`);

  return (
    <main className={styles.placeholder}>
      <a className={styles.placeholderBrand} href="#/dashboard" onClick={onBack}>
        <span aria-hidden="true">{t('common.brandInitials')}</span>
        {t('common.brandName')}
      </a>
      <section>
        <p>{t('placeholder.eyebrow')}</p>
        <h1>{t('placeholder.title', { name: destinationTitle })}</h1>
        <p>{t('placeholder.description')}</p>
        <div>
          <button onClick={onBack} type="button">
            {t('common.backToDashboard')}
          </button>
          <a href="https://github.com/eeminionn/rescueSketch/issues">
            {t('placeholder.collaborate')}
          </a>
        </div>
      </section>
    </main>
  );
}

function RescueSketchRouter() {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseRoute(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = (nextRoute: AppRoute) => {
    const nextHash = routeHash(nextRoute);

    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
    } else {
      window.location.hash = nextHash;
    }
  };

  const handleDashboardNavigation = (destination: DashboardDestination) => {
    if (destination === 'collaboration') {
      window.open(
        'https://github.com/eeminionn/rescueSketch/issues',
        '_blank',
        'noopener,noreferrer',
      );
      return;
    }

    navigate(destination === 'newTrack' ? 'editor' : destination);
  };

  if (route === 'editor') {
    return (
      <EditorWorkspace
        onExit={() => {
          navigate('dashboard');
        }}
      />
    );
  }

  if (route === 'rules') {
    return (
      <RulesReference
        onBack={() => {
          navigate('dashboard');
        }}
      />
    );
  }

  if (route === 'dashboard' || route === 'newTrack' || route === 'collaboration') {
    return <Dashboard onNavigate={handleDashboardNavigation} />;
  }

  return (
    <PlaceholderView
      destination={route}
      onBack={() => {
        navigate('dashboard');
      }}
    />
  );
}

export function RescueSketchApp() {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    [],
  );

  return (
    <RescueSketchI18nProvider>
      <QueryClientProvider client={queryClient}>
        <RescueSketchRouter />
      </QueryClientProvider>
    </RescueSketchI18nProvider>
  );
}
