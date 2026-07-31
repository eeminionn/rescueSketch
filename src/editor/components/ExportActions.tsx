import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createTrackDxf,
  createTrackJson,
  createTrackSvg,
  exportTrackPdf,
  exportTrackPng,
} from '../../export';
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
  const [pdfPending, setPdfPending] = useState(false);
  const [errorKind, setErrorKind] = useState<'png' | 'pdf' | null>(null);

  return (
    <div className={styles.exportActions}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('export.open')}
        className={styles.exportButton}
        onClick={() => {
          setErrorKind(null);
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
              setErrorKind(null);
              setPngPending(true);
              void exportTrackPng(document)
                .then((blob) => {
                  downloadBlob(blob, 'rescueSketch-track.png');
                  setOpen(false);
                })
                .catch(() => {
                  setErrorKind('png');
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
          <button
            disabled={pdfPending}
            onClick={() => {
              setErrorKind(null);
              setPdfPending(true);
              void exportTrackPdf(document)
                .then((blob) => {
                  downloadBlob(blob, 'rescueSketch-fabrication.pdf');
                  setOpen(false);
                })
                .catch(() => {
                  setErrorKind('pdf');
                })
                .finally(() => {
                  setPdfPending(false);
                });
            }}
            role="menuitem"
            type="button"
          >
            {pdfPending ? t('export.preparingPdf') : t('export.pdf')}
          </button>
          <button
            onClick={() => {
              downloadText(
                createTrackDxf(document),
                'rescueSketch-fabrication.dxf',
                'application/dxf',
              );
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            {t('export.dxf')}
          </button>
          {errorKind !== null ? (
            <p aria-live="polite" role="alert">
              {t(errorKind === 'pdf' ? 'export.pdfError' : 'export.error')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
