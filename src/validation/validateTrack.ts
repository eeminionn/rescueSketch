import { getCatalogItem, rescueSketchCatalog } from '../catalog';
import { parseTrackDocument, type TrackDocumentV1 } from '../domain';
import { rescueLine2026Ruleset } from '../rules';
import { validateCatalogParameters } from './rules/catalogParameterValidation';
import { validateDocumentRules } from './rules/documentValidation';
import { createManualValidationFindings } from './rules/manualValidation';
import {
  sortValidationFindings,
  summarizeValidationFindings,
  validationReportSchema,
  type ValidationFinding,
  type ValidationReport,
} from './validationTypes';

export interface ValidateTrackOptions {
  includeManualChecks?: boolean;
}

function assertCompatibleDocument(document: TrackDocumentV1): void {
  if (document.rulesetVersion !== rescueLine2026Ruleset.rulesetVersion) {
    throw new RangeError(
      `Unsupported rulesetVersion: ${document.rulesetVersion}. Expected ${rescueLine2026Ruleset.rulesetVersion}.`,
    );
  }

  if (document.catalogVersion !== rescueSketchCatalog.catalogVersion) {
    throw new RangeError(
      `Unsupported catalogVersion: ${document.catalogVersion}. Expected ${rescueSketchCatalog.catalogVersion}.`,
    );
  }

  for (const tile of document.tiles) {
    const catalogItem = getCatalogItem(tile.catalogItemId);

    if (catalogItem.kind === 'structure' || catalogItem.kind === 'zone') {
      throw new TypeError(
        `Catalog item ${catalogItem.id} must be stored in TrackDocumentV1.structures.`,
      );
    }
  }

  for (const structure of document.structures) {
    const catalogItem = getCatalogItem(structure.kind);

    if (catalogItem.kind !== 'structure' && catalogItem.kind !== 'zone') {
      throw new TypeError(
        `Catalog item ${catalogItem.id} cannot be stored in TrackDocumentV1.structures.`,
      );
    }
  }
}

function assertUniqueFindingIds(findings: readonly ValidationFinding[]): void {
  const findingIds = new Set<string>();

  for (const finding of findings) {
    if (findingIds.has(finding.id)) {
      throw new RangeError(`Duplicate validation finding id: ${finding.id}`);
    }

    findingIds.add(finding.id);
  }
}

export function validateTrackDocument(
  inputDocument: TrackDocumentV1,
  options: ValidateTrackOptions = {},
): ValidationReport {
  const document = parseTrackDocument(inputDocument);
  assertCompatibleDocument(document);
  const findings = [
    ...validateDocumentRules(document),
    ...validateCatalogParameters(document),
    ...(options.includeManualChecks === false ? [] : createManualValidationFindings(document)),
  ];

  assertUniqueFindingIds(findings);
  const sortedFindings = sortValidationFindings(findings);

  return validationReportSchema.parse({
    rulesetVersion: rescueLine2026Ruleset.rulesetVersion,
    findings: sortedFindings,
    summary: summarizeValidationFindings(sortedFindings),
  });
}
