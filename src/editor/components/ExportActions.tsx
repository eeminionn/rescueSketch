import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createTrackJson, createTrackSvg, exportTrackPng } from '../../export';
import type { TrackDocumentV1 } from '../../domain';
import styles from './exportActions.module.css';

export interface ExportActionsProps {
  document: TrackDocumentV1;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function downloadText(text: string, filename: string, mimeType: string): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

export function ExportActions({ document }: ExportActionsProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pngPending, setPngPending] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={styles.exportActions}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('export.open')}
        className={styles.exportButton}
        onClick={() => {
          setError(false);
          setOpen((current) => !current);
        }}
        type="button"
      >
        ⇩
      </button>
      {open ? (
        <div aria-label={t('export.title')} className={styles.exportMenu} role="menu">
          <button
            onClick={() => {
              downloadText(
                createTrackJson(document),
                'rescueSketch-track.json',
                'application/json',
              );
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            {t('export.json')}
          </button>
          <button
            onClick={() => {
              downloadText(createTrackSvg(document), 'rescueSketch-track.svg', 'image/svg+xml');
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            {t('export.svg')}
          </button>
          <button
            disabled={pngPending}
            onClick={() => {
              setError(false);
              setPngPending(true);
              void exportTrackPng(document)
                .then((blob) => {
                  downloadBlob(blob, 'rescueSketch-track.png');
                  setOpen(false);
                })
                .catch(() => {
                  setError(true);
                })
                .finally(() => {
                  setPngPending(false);
                });
            }}
            role="menuitem"
            type="button"
          >
            {pngPending ? t('export.downloading') : t('export.png')}
          </button>
          {error ? (
            <p aria-live="polite" role="alert">
              {t('export.error')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
