import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

import { getCatalogItem } from '../catalog';
import { createFabricationReport } from '../fabrication';
import { resolveCatalogGeometry } from '../fabrication/geometry';
import {
  parseTrackDocument,
  type TrackDocumentV1,
  type TrackStructure,
  type TrackTile,
} from '../domain';
import { renderTrackElementSvg, renderTrackSvg } from './renderTrackSvg';

export type PdfLanguage = 'es' | 'en';

export interface TrackPdfOptions {
  language?: PdfLanguage;
  includeElementSheets?: boolean;
  includeGrid?: boolean;
}

const copy = {
  es: {
    title: 'RescueSketch - Plano de fabricacion',
    subtitle: 'Referencia comunitaria no oficial para Rescue Line 2026',
    calibration: 'Cuadrado de calibracion 50 x 50 mm',
    print: 'Imprimir al 100% - desactivar ajustar a pagina y escala automatica.',
    source: 'Fuente: RoboCupJunior Rescue Line 2026 - geometria recreada, no oficial.',
    dimensions: 'Dimensiones',
    inventory: 'Inventario de construccion',
    tape: 'Cinta necesaria',
    net: 'Neto',
    purchase: 'Compra',
    color: 'Color',
    width: 'Ancho',
    element: 'Elemento',
    route: 'Trazado',
    radii: 'Radios',
    tileSheet: 'Hoja de fabricacion',
    sheetInstruction: 'Esta hoja esta preparada para replicar el elemento a escala 1:1.',
    quantity: 'Cantidad',
  },
  en: {
    title: 'RescueSketch - Fabrication plan',
    subtitle: 'Unofficial community reference for Rescue Line 2026',
    calibration: '50 x 50 mm calibration square',
    print: 'Print at 100% - disable fit to page and automatic scaling.',
    source: 'Source: RoboCupJunior Rescue Line 2026 - recreated geometry, unofficial.',
    dimensions: 'Dimensions',
    inventory: 'Construction inventory',
    tape: 'Required tape',
    net: 'Net',
    purchase: 'Purchase',
    color: 'Colour',
    width: 'Width',
    element: 'Element',
    route: 'Route',
    radii: 'Radii',
    tileSheet: 'Fabrication sheet',
    sheetInstruction: 'This sheet is prepared to reproduce the element at 1:1 scale.',
    quantity: 'Quantity',
  },
} as const;

function formatMm(value: number): string {
  return `${Number(value.toFixed(2))} mm`;
}

function drawCalibration(
  pdf: jsPDF,
  x: number,
  y: number,
  labels: (typeof copy)[PdfLanguage],
): void {
  pdf.setDrawColor(20, 37, 33);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, 50, 50);
  pdf.setFontSize(6);
  pdf.text(labels.calibration, x + 55, y + 25);
}

function drawHeader(
  pdf: jsPDF,
  title: string,
  labels: (typeof copy)[PdfLanguage],
  pageWidth: number,
): void {
  pdf.setTextColor(16, 35, 31);
  pdf.setFontSize(13);
  pdf.text(title, 20, 15);
  pdf.setFontSize(7);
  pdf.setTextColor(80, 100, 92);
  pdf.text(labels.subtitle, 20, 23);
  pdf.text(labels.print, 20, 31);
  pdf.text(labels.source, 20, 38);
  pdf.setDrawColor(170, 184, 182);
  pdf.setLineWidth(0.25);
  pdf.line(20, 44, pageWidth - 20, 44);
}

function resolveReportGeometry(element: TrackTile | TrackStructure) {
  try {
    return resolveCatalogGeometry(
      'catalogItemId' in element ? element.catalogItemId : element.kind,
      element.parameters,
    );
  } catch {
    return [];
  }
}

function drawSchedulePage(
  pdf: jsPDF,
  document: TrackDocumentV1,
  labels: (typeof copy)[PdfLanguage],
): void {
  const pageWidth = 297;
  drawHeader(pdf, labels.dimensions, labels, pageWidth);
  const report = createFabricationReport(document, {
    resolveGeometry: (element) => resolveReportGeometry(element),
  });
  let y = 54;

  pdf.setFontSize(9);
  pdf.setTextColor(16, 35, 31);
  pdf.text(
    `${labels.dimensions}: ${formatMm(report.summary.canvas.widthMm)} x ${formatMm(report.summary.canvas.heightMm)}`,
    20,
    y,
  );
  y += 10;
  pdf.setFontSize(7);
  pdf.text(`${labels.element}: ${report.summary.elements.total}`, 20, y);
  pdf.text(`${labels.route}: ${formatMm(report.summary.elements.totalLineLengthMm)}`, 78, y);
  pdf.text(
    `${labels.radii}: ${report.summary.elements.uniqueRadiiMm.map(formatMm).join(', ') || '-'}`,
    170,
    y,
  );
  y += 12;

  pdf.setFontSize(9);
  pdf.text(labels.tape, 20, y);
  y += 7;
  pdf.setFontSize(7);
  pdf.text(`${labels.color} / ${labels.width}`, 20, y);
  pdf.text(labels.net, 115, y);
  pdf.text(labels.purchase, 170, y);
  y += 5;
  for (const tape of report.tapeRequirements) {
    pdf.text(`${tape.color} / ${formatMm(tape.widthMm)}`, 20, y);
    pdf.text(formatMm(tape.netLengthMm), 115, y);
    pdf.text(formatMm(tape.purchaseLengthMm), 170, y);
    y += 5;
  }

  y += 6;
  pdf.setFontSize(9);
  pdf.text(labels.inventory, 20, y);
  y += 7;
  pdf.setFontSize(7);
  for (const item of report.inventory.items) {
    pdf.text(`${item.names[labels === copy.es ? 'es' : 'en']} - ${item.catalogItemId}`, 20, y);
    pdf.text(`${labels.quantity}: ${item.quantity}`, 170, y);
    y += 5;
  }
  for (const material of report.inventory.materials) {
    pdf.text(`${material.materialId} - ${material.specification.widthMm ?? ''} mm`, 20, y);
    pdf.text(`${labels.quantity}: ${material.quantity}`, 170, y);
    y += 5;
  }

  y += 6;
  pdf.setFontSize(9);
  pdf.text(labels.dimensions, 20, y);
  y += 7;
  pdf.setFontSize(6);
  for (const measurement of report.measurements.slice(0, 22)) {
    pdf.text(
      `${measurement.elementId}  ${formatMm(measurement.footprint.widthMm)} x ${formatMm(measurement.footprint.depthMm)}  ${labels.route}: ${formatMm(measurement.lineLengthMm)}`,
      20,
      y,
    );
    y += 4;
    if (y > 195) break;
  }
}

async function addSvgPage(
  pdf: jsPDF,
  svgMarkup: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  if (typeof DOMParser === 'undefined') {
    throw new Error('PDF export requires a browser DOM parser.');
  }

  const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  const svgElement = parsed.documentElement;

  if (svgElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('Could not parse the SVG source for PDF export.');
  }

  await svg2pdf(svgElement, pdf, {
    x,
    y,
    width,
    height,
    loadExternalStyleSheets: false,
  });
}

export async function exportTrackPdf(
  inputDocument: TrackDocumentV1,
  options: TrackPdfOptions = {},
): Promise<Blob> {
  const document = parseTrackDocument(inputDocument);
  const language = options.language ?? 'es';
  const labels = copy[language];
  const pageWidth = document.canvas.widthMm + 40;
  const pageHeight = document.canvas.heightMm + 135;
  const pdf = new jsPDF({ unit: 'mm', format: [pageWidth, pageHeight] });

  drawHeader(pdf, labels.title, labels, pageWidth);
  drawCalibration(pdf, 20, 48, labels);
  await addSvgPage(
    pdf,
    renderTrackSvg(document, { includeGrid: options.includeGrid ?? true }),
    20,
    108,
    document.canvas.widthMm,
    document.canvas.heightMm,
  );
  pdf.setFontSize(6);
  pdf.text(`${labels.title} - ${document.rulesetVersion}`, 20, pageHeight - 12);

  pdf.addPage([297, 210]);
  drawSchedulePage(pdf, document, labels);

  if (options.includeElementSheets !== false) {
    const elements = [...document.tiles, ...document.structures];

    for (const element of elements) {
      const item = getCatalogItem(
        'catalogItemId' in element ? element.catalogItemId : element.kind,
      );
      const width = item.svgDescriptor.viewBox.width;
      const height = item.svgDescriptor.viewBox.height;
      const sheetWidth = width + 40;
      const sheetHeight = height + 140;

      pdf.addPage([sheetWidth, sheetHeight]);
      drawHeader(pdf, `${labels.tileSheet}: ${item.names[language]}`, labels, sheetWidth);
      drawCalibration(pdf, 20, 48, labels);
      await addSvgPage(pdf, renderTrackElementSvg(element), 20, 108, width, height);
      pdf.setFontSize(6);
      pdf.text(
        `${labels.sheetInstruction}  ${formatMm(width)} x ${formatMm(height)}`,
        20,
        sheetHeight - 12,
      );
    }
  }

  return pdf.output('blob');
}

export const createTrackPdf = exportTrackPdf;
