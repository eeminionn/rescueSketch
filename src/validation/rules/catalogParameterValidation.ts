import { rescueSketchCatalog, type CatalogItem, type NormativeParameter } from '../../catalog';
import type { RulesetEntry, TrackDocumentV1, TrackStructure } from '../../domain';
import { getRescueLine2026Rule } from '../../rules';
import {
  createValidationFinding,
  sortValidationFindings,
  type ValidationFinding,
  type ValidationSeverity,
} from '../validationTypes';

type ParameterBoundary = 'minimum' | 'maximum' | 'maximumExclusive';
type ValidatableElement = TrackDocumentV1['tiles'][number] | TrackDocumentV1['structures'][number];

interface BoundaryCheck {
  boundary: ParameterBoundary;
  expectedValue: number;
}

type ResolvedParameterValue =
  | {
      kind: 'valid';
      value: number;
    }
  | {
      kind: 'invalid';
      value: string | boolean;
    };

const catalogItemsById = new Map(
  rescueSketchCatalog.items.map((catalogItem) => [catalogItem.id, catalogItem] as const),
);

const structureCatalogIdByKind = {
  bridge: 'bridge',
  pillar: 'pillar',
  ramp: 'ramp',
  seesaw: 'seesaw',
  evacuationZone: 'evacuationZone',
  obstacle: 'obstacle',
  speedBump: 'speedBump',
  debris: 'debris',
  livingSafePoint: 'livingSafePoint',
  deadSafePoint: 'deadSafePoint',
} as const satisfies Readonly<Record<TrackStructure['kind'], string>>;

function getBoundaryChecks(parameter: NormativeParameter): BoundaryCheck[] {
  const checks: BoundaryCheck[] = [];

  if (parameter.minimum !== undefined) {
    checks.push({ boundary: 'minimum', expectedValue: parameter.minimum });
  }

  if (parameter.maximum !== undefined) {
    checks.push({ boundary: 'maximum', expectedValue: parameter.maximum });
  }

  if (parameter.maximumExclusive !== undefined) {
    checks.push({
      boundary: 'maximumExclusive',
      expectedValue: parameter.maximumExclusive,
    });
  }

  return checks;
}

function violatesBoundary(actualValue: number, check: BoundaryCheck): boolean {
  if (check.boundary === 'minimum') {
    return actualValue < check.expectedValue;
  }

  if (check.boundary === 'maximum') {
    return actualValue > check.expectedValue;
  }

  return actualValue >= check.expectedValue;
}

function getBoundaryRule(parameter: NormativeParameter, check: BoundaryCheck) {
  const rulesWithExpectedValue = parameter.ruleIds
    .map((ruleId) => getRescueLine2026Rule(ruleId))
    .filter(({ value }) => value === check.expectedValue);

  if (rulesWithExpectedValue.length === 0) {
    throw new RangeError(
      `No rule value matches ${parameter.id}.${check.boundary}=${String(check.expectedValue)}.`,
    );
  }

  const boundaryName = check.boundary === 'minimum' ? 'Min' : 'Max';

  return (
    rulesWithExpectedValue.find(({ id }) => id.includes(boundaryName)) ?? rulesWithExpectedValue[0]!
  );
}

function serializeInvalidValue(value: unknown): string | boolean {
  if (typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return 'NaN';
    }

    return value > 0 ? 'Infinity' : '-Infinity';
  }

  return String(value);
}

function resolveActualValue(
  element: ValidatableElement,
  parameter: NormativeParameter,
): ResolvedParameterValue {
  if (!Object.prototype.hasOwnProperty.call(element.parameters, parameter.id)) {
    return {
      kind: 'valid',
      value: parameter.defaultValue,
    };
  }

  const configuredValue: unknown = element.parameters[parameter.id];

  if (typeof configuredValue === 'number' && Number.isFinite(configuredValue)) {
    return {
      kind: 'valid',
      value: configuredValue,
    };
  }

  return {
    kind: 'invalid',
    value: serializeInvalidValue(configuredValue),
  };
}

function formatMeasurement(value: number, parameter: NormativeParameter): string {
  const unit = parameter.unit === 'count' ? '' : ` ${parameter.unit}`;
  return `${String(value)}${unit}`;
}

function isExactParameter(parameter: NormativeParameter): boolean {
  return (
    parameter.minimum !== undefined &&
    parameter.maximum !== undefined &&
    parameter.minimum === parameter.maximum
  );
}

function getExpectedDescriptions(
  parameter: NormativeParameter,
  check: BoundaryCheck,
): { es: string; en: string } {
  const measurement = formatMeasurement(check.expectedValue, parameter);

  if (isExactParameter(parameter)) {
    return {
      es: `exactamente ${measurement}`,
      en: `exactly ${measurement}`,
    };
  }

  if (check.boundary === 'minimum') {
    return {
      es: `al menos ${measurement}`,
      en: `at least ${measurement}`,
    };
  }

  if (check.boundary === 'maximum') {
    return {
      es: `como máximo ${measurement}`,
      en: `at most ${measurement}`,
    };
  }

  return {
    es: `menor que ${measurement}`,
    en: `less than ${measurement}`,
  };
}

function getSuggestedCorrections(
  parameter: NormativeParameter,
  check: BoundaryCheck,
): { es: string; en: string } {
  const measurement = formatMeasurement(check.expectedValue, parameter);

  if (isExactParameter(parameter)) {
    return {
      es: `Ajusta ${parameter.names.es.toLocaleLowerCase('es')} a ${measurement}.`,
      en: `Set ${parameter.names.en.toLocaleLowerCase('en')} to ${measurement}.`,
    };
  }

  if (check.boundary === 'minimum') {
    return {
      es: `Aumenta ${parameter.names.es.toLocaleLowerCase('es')} a ${measurement} o más.`,
      en: `Increase ${parameter.names.en.toLocaleLowerCase('en')} to ${measurement} or more.`,
    };
  }

  if (check.boundary === 'maximum') {
    return {
      es: `Reduce ${parameter.names.es.toLocaleLowerCase('es')} a ${measurement} o menos.`,
      en: `Reduce ${parameter.names.en.toLocaleLowerCase('en')} to ${measurement} or less.`,
    };
  }

  return {
    es: `Reduce ${parameter.names.es.toLocaleLowerCase('es')} a un valor menor que ${measurement}.`,
    en: `Reduce ${parameter.names.en.toLocaleLowerCase('en')} to a value below ${measurement}.`,
  };
}

function getBoundarySeverity(rule: RulesetEntry): ValidationSeverity {
  if (rule.ruleType === 'advice' || rule.validationMode === 'informational') {
    return 'info';
  }

  if (rule.validationMode === 'manual') {
    return 'manual';
  }

  if (rule.ruleType === 'constructionParameter') {
    return 'warning';
  }

  return 'error';
}

function getInvalidParameterFinding(
  element: ValidatableElement,
  catalogItem: CatalogItem,
  parameter: NormativeParameter,
  actualValue: string | boolean,
): ValidationFinding {
  const rule = getRescueLine2026Rule(parameter.ruleIds[0]!);
  const expectedValue = parameter.defaultValue;
  const expectedMeasurement = formatMeasurement(expectedValue, parameter);

  return createValidationFinding({
    id: `catalogParameter.${element.id}.${parameter.id}.invalidValue`,
    // Invalid typed input compromises deterministic geometry and export even when the
    // referenced measurement is advice or requires a physical/manual verification.
    severity: 'error',
    elementId: element.id,
    messages: {
      es: `${catalogItem.names.es}: ${parameter.names.es} debe ser un número finito.`,
      en: `${catalogItem.names.en}: ${parameter.names.en} must be a finite number.`,
    },
    rule,
    suggestedCorrection: {
      es: `Reemplaza el valor por un número finito; el valor nominal es ${expectedMeasurement}.`,
      en: `Replace the value with a finite number; the nominal value is ${expectedMeasurement}.`,
    },
    actualValue,
    expectedValue,
  });
}

function validateElement(
  element: ValidatableElement,
  catalogItem: CatalogItem,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const parameter of catalogItem.parameters.normative) {
    const resolvedValue = resolveActualValue(element, parameter);

    if (resolvedValue.kind === 'invalid') {
      findings.push(
        getInvalidParameterFinding(element, catalogItem, parameter, resolvedValue.value),
      );
      continue;
    }

    const actualValue = resolvedValue.value;

    for (const check of getBoundaryChecks(parameter)) {
      if (!violatesBoundary(actualValue, check)) {
        continue;
      }

      const expected = getExpectedDescriptions(parameter, check);
      const rule = getBoundaryRule(parameter, check);

      findings.push(
        createValidationFinding({
          id: `catalogParameter.${element.id}.${parameter.id}.${check.boundary}`,
          severity: getBoundarySeverity(rule),
          elementId: element.id,
          messages: {
            es: `${catalogItem.names.es}: ${parameter.names.es} debe ser ${expected.es}.`,
            en: `${catalogItem.names.en}: ${parameter.names.en} must be ${expected.en}.`,
          },
          rule,
          suggestedCorrection: getSuggestedCorrections(parameter, check),
          actualValue,
          expectedValue: check.expectedValue,
        }),
      );
    }
  }

  return findings;
}

/**
 * Validates only numeric limits that the catalog traces to normative Rescue Line rules.
 * Fabrication choices, including curve radii, are intentionally excluded.
 */
export function validateCatalogParameters(document: TrackDocumentV1): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  for (const tile of document.tiles) {
    const catalogItem = catalogItemsById.get(tile.catalogItemId);

    if (catalogItem !== undefined) {
      findings.push(...validateElement(tile, catalogItem));
    }
  }

  for (const structure of document.structures) {
    const catalogItem = catalogItemsById.get(structureCatalogIdByKind[structure.kind]);

    if (catalogItem !== undefined) {
      findings.push(...validateElement(structure, catalogItem));
    }
  }

  return sortValidationFindings(findings);
}
