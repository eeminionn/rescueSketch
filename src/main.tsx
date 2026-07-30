import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { FoundationApp } from './app/FoundationApp';

const rootElement = document.querySelector<HTMLDivElement>('#root');

if (rootElement === null) {
  throw new Error('RescueSketch could not find its root element.');
}

createRoot(rootElement).render(
  <StrictMode>
    <FoundationApp />
  </StrictMode>,
);
