import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AppLanguage } from '../../i18n';
import type { ValidationReport, ValidationSeverity } from '../../validation';
import styles from './validationPanel.module.css';

export interface ValidationPanelProps {
  report: ValidationReport;
  onSelectElement: (elementId: string) => void;
}

const severityIcon: Readonly<Record<ValidationSeverity, string>> = {
  error: '×',
  warning: '!',
  manual: '?',
  info: 'i',
};

export function ValidationPanel({ report, onSelectElement }: ValidationPanelProps) {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es';
  const [expanded, setExpanded] = useState(false);
  const issueCount =
    report.summary.errors +
    report.summary.warnings +
    report.summary.manualChecks +
    report.summary.information;
  const leadSeverity: ValidationSeverity =
    report.summary.errors > 0
      ? 'error'
      : report.summary.warnings > 0
        ? 'warning'
        : report.summary.manualChecks > 0
          ? 'manual'
          : 'info';

  return (
    <section
      aria-label={t('validation.panelLabel')}
      className={styles.validationPanel}
      data-expanded={expanded || undefined}
      data-severity={leadSeverity}
    >
      <div className={styles.summary}>
        <span aria-hidden="true" className={styles.summaryIcon}>
          {issueCount === 0 ? '✓' : severityIcon[leadSeverity]}
        </span>
        <div aria-atomic="true" aria-live="polite">
          <strong>
            {report.summary.errors > 0
              ? t('validation.errorSummary', { count: report.summary.errors })
              : t('validation.readySummary')}
          </strong>
          <p>
            {[
              t('validation.summaryErrors', { count: report.summary.errors }),
              t('validation.summaryWarnings', { count: report.summary.warnings }),
              t('validation.summaryManualChecks', {
                count: report.summary.manualChecks,
              }),
            ].join(' · ')}
          </p>
        </div>
        <button
          aria-expanded={expanded}
          className={styles.expandButton}
          disabled={issueCount === 0}
          onClick={() => {
            setExpanded((current) => !current);
          }}
          type="button"
        >
          {expanded ? t('validation.hideFindings') : t('validation.showFindings')}
          <span aria-hidden="true">{expanded ? '↓' : '↑'}</span>
        </button>
      </div>

      {expanded ? (
        <div className={styles.findingList}>
          {report.findings.map((finding) => (
            <article data-severity={finding.severity} key={finding.id}>
              <span aria-hidden="true" className={styles.findingIcon}>
                {severityIcon[finding.severity]}
              </span>
              <div>
                <strong>{finding.messages[language]}</strong>
                <p>{finding.suggestedCorrection[language]}</p>
                <small>
                  {finding.rule.ruleId} · § {finding.rule.section} · {t('common.pageAbbreviation')}{' '}
                  {finding.rule.page}
                </small>
              </div>
              {finding.elementId === 'track' || finding.elementId === 'canvas' ? null : (
                <button
                  onClick={() => {
                    onSelectElement(finding.elementId);
                  }}
                  type="button"
                >
                  {t('validation.locateElement')}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
