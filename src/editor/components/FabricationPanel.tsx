import { useTranslation } from 'react-i18next';

import type { FabricationReport } from '../../fabrication';
import type { AppLanguage } from '../../i18n';
import styles from './fabricationPanel.module.css';

export interface FabricationPanelProps {
  report: FabricationReport;
  language: AppLanguage;
  onClose: () => void;
  onWasteRatioChange: (wasteRatio: number) => void;
}

function formatNumber(value: number, language: AppLanguage): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatMillimetres(value: number, language: AppLanguage): string {
  return `${formatNumber(value, language)} mm`;
}

export function FabricationPanel({
  report,
  language,
  onClose,
  onWasteRatioChange,
}: FabricationPanelProps) {
  const { t } = useTranslation();
  const { canvas, elements } = report.summary;

  return (
    <aside aria-label={t('fabrication.panelTitle')} className={styles.fabricationPanel}>
      <header className={styles.panelHeader}>
        <div>
          <span>{t('fabrication.panelEyebrow')}</span>
          <h2>{t('fabrication.panelTitle')}</h2>
        </div>
        <button aria-label={t('common.close')} onClick={onClose} type="button">
          ×
        </button>
      </header>

      <div className={styles.panelContent}>
        <section aria-labelledby="fabrication-summary-title">
          <h3 id="fabrication-summary-title">{t('fabrication.summaryTitle')}</h3>
          <dl className={styles.summaryGrid}>
            <div>
              <dt>{t('fabrication.canvasSize')}</dt>
              <dd>
                {formatMillimetres(canvas.widthMm, language)} ×{' '}
                {formatMillimetres(canvas.heightMm, language)}
              </dd>
            </div>
            <div>
              <dt>{t('fabrication.tileCount')}</dt>
              <dd>{formatNumber(elements.tileCount, language)}</dd>
            </div>
            <div>
              <dt>{t('fabrication.structureCount')}</dt>
              <dd>{formatNumber(elements.structureCount, language)}</dd>
            </div>
            <div>
              <dt>{t('fabrication.totalLineLength')}</dt>
              <dd>{formatMillimetres(elements.totalLineLengthMm, language)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="fabrication-tape-title">
          <div className={styles.sectionHeading}>
            <div>
              <h3 id="fabrication-tape-title">{t('fabrication.tapeTitle')}</h3>
              <p>{t('fabrication.tapeDescription')}</p>
            </div>
            <label className={styles.wasteControl}>
              <span>{t('fabrication.wasteAllowance')}</span>
              <span>
                <input
                  aria-describedby="fabrication-waste-help"
                  inputMode="decimal"
                  max={100}
                  min={0}
                  onChange={(event) => {
                    const percentage = Number(event.currentTarget.value);

                    if (Number.isFinite(percentage) && percentage >= 0 && percentage <= 100) {
                      onWasteRatioChange(percentage / 100);
                    }
                  }}
                  step={1}
                  type="number"
                  value={report.wasteRatio * 100}
                />
                <em>%</em>
              </span>
            </label>
          </div>
          <p className={styles.visuallyHidden} id="fabrication-waste-help">
            {t('fabrication.wasteHelp')}
          </p>

          {report.tapeRequirements.length === 0 ? (
            <p className={styles.emptyState}>{t('fabrication.emptyTape')}</p>
          ) : (
            <div className={styles.tableViewport}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('fabrication.tapeColor')}</th>
                    <th scope="col">{t('fabrication.tapeWidth')}</th>
                    <th scope="col">{t('fabrication.netLength')}</th>
                    <th scope="col">{t('fabrication.purchaseLength')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.tapeRequirements.map((requirement) => (
                    <tr key={`${requirement.color}-${requirement.widthMm}`}>
                      <th scope="row">
                        <span
                          aria-hidden="true"
                          className={styles.colorSwatch}
                          data-color={requirement.color}
                        />
                        {t(`fabrication.colors.${requirement.color}`, {
                          defaultValue: requirement.color,
                        })}
                      </th>
                      <td>{formatMillimetres(requirement.widthMm, language)}</td>
                      <td>{formatMillimetres(requirement.netLengthMm, language)}</td>
                      <td>{formatMillimetres(requirement.purchaseLengthMm, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="fabrication-inventory-title">
          <h3 id="fabrication-inventory-title">{t('fabrication.inventoryTitle')}</h3>
          <p>{t('fabrication.inventoryDescription')}</p>

          {report.inventory.items.length === 0 && report.inventory.materials.length === 0 ? (
            <p className={styles.emptyState}>{t('fabrication.emptyInventory')}</p>
          ) : (
            <ul className={styles.inventoryList}>
              {report.inventory.items.map((item) => (
                <li key={`${item.group}-${item.catalogItemId}`}>
                  <span>
                    <strong>{item.names[language]}</strong>
                    <small>
                      {t(`fabrication.categories.${item.group}`, {
                        defaultValue: item.group,
                      })}
                    </small>
                  </span>
                  <output
                    aria-label={`${t('fabrication.quantity')}: ${formatNumber(
                      item.quantity,
                      language,
                    )}`}
                  >
                    × {formatNumber(item.quantity, language)}
                  </output>
                </li>
              ))}
              {report.inventory.materials.map((material) => (
                <li key={material.materialId}>
                  <span>
                    <strong>
                      {t(`fabrication.materials.${material.materialId}`, {
                        defaultValue: material.materialId,
                      })}
                    </strong>
                    <small>{t('fabrication.categories.material')}</small>
                  </span>
                  <output>
                    {material.unit === 'linearMm'
                      ? formatMillimetres(material.netLengthMm, language)
                      : `× ${formatNumber(material.quantity, language)}`}
                  </output>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className={styles.derivedNotice}>{t('fabrication.derivedNotice')}</p>
      </div>
    </aside>
  );
}
