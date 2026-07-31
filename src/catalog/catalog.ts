import { getRescueLine2026Rule, rescueLine2026Ruleset } from '../rules';
import {
  catalogItemSchema,
  catalogSchema,
  constructionParameterSchema,
  normativeParameterSchema,
  type CatalogItem,
  type ConstructionParameter,
  type NormativeParameter,
  type RuleReference,
} from './catalogTypes';
import {
  bridgeDescriptor,
  checkpointDescriptor,
  curveLineDescriptor,
  deadEndIntersectionDescriptor,
  deadSafePointDescriptor,
  deadVictimDescriptor,
  debrisDescriptor,
  diagonalLineDescriptor,
  evacuationEntranceDescriptor,
  evacuationExitDescriptor,
  evacuationZoneDescriptor,
  fourWayIntersectionDescriptor,
  gapLineDescriptor,
  goalTileDescriptor,
  livingSafePointDescriptor,
  livingVictimDescriptor,
  obstacleDescriptor,
  pillarDescriptor,
  plainFourWayIntersectionDescriptor,
  rampDescriptor,
  seesawDescriptor,
  speedBumpDescriptor,
  startTileDescriptor,
  straightLineDescriptor,
  threeWayIntersectionDescriptor,
  wavyLineDescriptor,
} from './svgDescriptors';

export const catalogSourceId = 'robocupJuniorRescueLineRules2026';
export const catalogVersion = '2026.1';

function text(es: string, en: string) {
  return { es, en };
}

function normative(input: Omit<NormativeParameter, 'parameterType'>): NormativeParameter {
  return normativeParameterSchema.parse({
    ...input,
    parameterType: 'normative',
  });
}

function construction(input: Omit<ConstructionParameter, 'parameterType'>): ConstructionParameter {
  return constructionParameterSchema.parse({
    ...input,
    parameterType: 'constructionParameter',
  });
}

function ruleReference(ruleId: string): RuleReference {
  const rule = getRescueLine2026Rule(ruleId);

  return {
    ruleId,
    sourceId: catalogSourceId,
    section: rule.section,
    page: rule.page,
  };
}

function item(
  input: Omit<CatalogItem, 'ruleReferences'> & { ruleIds: readonly string[] },
): CatalogItem {
  const { ruleIds, ...catalogItem } = input;

  return catalogItemSchema.parse({
    ...catalogItem,
    ruleReferences: ruleIds.map(ruleReference),
  });
}

const tileWidth = normative({
  id: 'tileWidthMm',
  names: text('Ancho de baldosa', 'Tile width'),
  descriptions: text('Ancho nominal de la baldosa modular.', 'Nominal modular tile width.'),
  defaultValue: 300,
  unit: 'mm',
  ruleIds: ['field.tileWidthMm'],
  minimum: 300,
  maximum: 300,
});

const tileHeight = normative({
  id: 'tileHeightMm',
  names: text('Alto de baldosa', 'Tile height'),
  descriptions: text('Alto nominal de la baldosa modular.', 'Nominal modular tile height.'),
  defaultValue: 300,
  unit: 'mm',
  ruleIds: ['field.tileHeightMm'],
  minimum: 300,
  maximum: 300,
});

const lineWidth = normative({
  id: 'lineWidthMm',
  names: text('Ancho de línea', 'Line width'),
  descriptions: text(
    'Ancho de la cinta o impresión negra.',
    'Width of the black tape or printed line.',
  ),
  defaultValue: 15,
  unit: 'mm',
  ruleIds: ['line.widthMinMm', 'line.widthMaxMm'],
  minimum: 10,
  maximum: 20,
});

const standardLineRuleIds = [
  'field.tileWidthMm',
  'field.tileHeightMm',
  'line.widthMinMm',
  'line.widthMaxMm',
  'line.clearanceMinMm',
] as const;

const standardLineParameters = {
  normative: [tileWidth, tileHeight, lineWidth],
  constructionParameter: [],
};

const catalogItems: CatalogItem[] = [
  item({
    id: 'straightLine',
    category: 'line',
    kind: 'tile',
    names: text('Línea recta', 'Straight line'),
    descriptions: text(
      'Baldosa con un segmento recto centrado.',
      'Tile with one centered straight segment.',
    ),
    nominalDimensions: { widthMm: 300, heightMm: 300, lineWidthMm: 15 },
    parameters: {
      ...standardLineParameters,
      constructionParameter: [
        construction({
          id: 'lineOffsetMm',
          names: text('Desplazamiento de línea', 'Line offset'),
          descriptions: text(
            'Posición de fabricación dentro de la baldosa; no es una medida reglamentaria.',
            'Fabrication position within the tile; this is not a rules measurement.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: standardLineRuleIds,
    advice: text(
      'Marca los centros de ambos bordes antes de tender la cinta.',
      'Mark both edge centres before laying the tape.',
    ),
    svgDescriptor: straightLineDescriptor,
  }),
  item({
    id: 'curveLine',
    category: 'line',
    kind: 'tile',
    names: text('Curva circular', 'Circular curve'),
    descriptions: text(
      'Curva de cuarto de vuelta con radio editable para fabricación.',
      'Quarter-turn curve with an editable fabrication radius.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      lineWidthMm: 15,
      curveRadiusMm: 150,
    },
    parameters: {
      ...standardLineParameters,
      constructionParameter: [
        construction({
          id: 'curveRadiusMm',
          names: text('Radio de fabricación', 'Fabrication radius'),
          descriptions: text(
            'Radio elegido para construir la curva; RoboCup no prescribe un radio.',
            'Radius selected to build the curve; RoboCup does not prescribe a radius.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: standardLineRuleIds,
    advice: text(
      'Usa un compás de varilla y conserva el radio anotado en el plano.',
      'Use a beam compass and keep the chosen radius on the fabrication plan.',
    ),
    svgDescriptor: curveLineDescriptor,
  }),
  item({
    id: 'gapLine',
    category: 'line',
    kind: 'tile',
    names: text('Línea con gap', 'Line gap'),
    descriptions: text(
      'Tramo recto interrumpido dentro del máximo reglamentario.',
      'Interrupted straight segment within the rules maximum.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      lineWidthMm: 15,
      gapLengthMm: 150,
    },
    parameters: {
      normative: [
        ...standardLineParameters.normative,
        normative({
          id: 'gapLengthMm',
          names: text('Largo del gap', 'Gap length'),
          descriptions: text('Longitud sin línea negra.', 'Length without black line.'),
          defaultValue: 150,
          unit: 'mm',
          ruleIds: ['line.gapLengthMaxMm'],
          maximum: 200,
        }),
        normative({
          id: 'straightBeforeGapMm',
          names: text('Recta previa', 'Straight before gap'),
          descriptions: text(
            'Línea recta mínima antes del gap.',
            'Minimum straight line before the gap.',
          ),
          defaultValue: 50,
          unit: 'mm',
          ruleIds: ['line.straightBeforeGapMinMm'],
          minimum: 50,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'gapCenterMm',
          names: text('Centro del gap', 'Gap centre'),
          descriptions: text(
            'Ubicación del centro para el trazado de fabricación.',
            'Centre location used for fabrication layout.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [...standardLineRuleIds, 'line.gapLengthMaxMm', 'line.straightBeforeGapMinMm'],
    advice: text(
      'Mide el gap después de pintar o pegar para confirmar su largo final.',
      'Measure the gap after painting or taping to confirm its final length.',
    ),
    svgDescriptor: gapLineDescriptor,
  }),
  item({
    id: 'diagonalLine',
    category: 'line',
    kind: 'tile',
    names: text('Línea diagonal', 'Diagonal line'),
    descriptions: text(
      'Segmento recto entre dos bordes no opuestos.',
      'Straight segment joining non-opposite edges.',
    ),
    nominalDimensions: { widthMm: 300, heightMm: 300, lineWidthMm: 15 },
    parameters: {
      ...standardLineParameters,
      constructionParameter: [
        construction({
          id: 'edgeInsetMm',
          names: text('Retiro del vértice', 'Corner inset'),
          descriptions: text(
            'Retiro elegido para marcar los extremos; no es un límite reglamentario.',
            'Chosen endpoint inset; it is not a rules limit.',
          ),
          defaultValue: 0,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: standardLineRuleIds,
    advice: text(
      'Traza primero una cuerda guía para evitar ondulaciones involuntarias.',
      'Draw a guide chord first to avoid unintended waviness.',
    ),
    svgDescriptor: diagonalLineDescriptor,
  }),
  item({
    id: 'wavyLine',
    category: 'line',
    kind: 'tile',
    names: text('Línea ondulada', 'Wavy line'),
    descriptions: text(
      'Trayectoria suave definida con curvas continuas.',
      'Smooth path defined by continuous curves.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      lineWidthMm: 15,
      amplitudeMm: 75,
    },
    parameters: {
      ...standardLineParameters,
      constructionParameter: [
        construction({
          id: 'amplitudeMm',
          names: text('Amplitud de fabricación', 'Fabrication amplitude'),
          descriptions: text(
            'Amplitud elegida para el boceto; no es una regla RoboCup.',
            'Amplitude selected for the sketch; it is not a RoboCup rule.',
          ),
          defaultValue: 75,
          unit: 'mm',
          step: 1,
        }),
        construction({
          id: 'waveLengthMm',
          names: text('Longitud de onda', 'Wave length'),
          descriptions: text(
            'Separación constructiva entre crestas.',
            'Construction spacing between crests.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: standardLineRuleIds,
    advice: text(
      'Usa una plantilla flexible y comprueba que la cinta no se pliegue.',
      'Use a flexible template and check that the tape does not crease.',
    ),
    svgDescriptor: wavyLineDescriptor,
  }),
  item({
    id: 'threeWayIntersection',
    category: 'intersection',
    kind: 'tile',
    names: text('Intersección de tres vías', 'Three-way intersection'),
    descriptions: text(
      'Intersección perpendicular de tres ramas con marcador direccional.',
      'Perpendicular three-branch intersection with a direction marker.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      markerWidthMm: 25,
      markerHeightMm: 25,
    },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'branchCount',
          names: text('Cantidad de ramas', 'Branch count'),
          descriptions: text('Cantidad de ramas de la intersección.', 'Intersection branch count.'),
          defaultValue: 3,
          unit: 'count',
          ruleIds: ['intersection.branchCountMin', 'intersection.branchCountMax'],
          minimum: 3,
          maximum: 4,
        }),
        normative({
          id: 'markerWidthMm',
          names: text('Ancho del marcador', 'Marker width'),
          descriptions: text('Ancho del marcador verde.', 'Green marker width.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['intersection.markerWidthMm'],
          minimum: 25,
          maximum: 25,
        }),
        normative({
          id: 'markerHeightMm',
          names: text('Alto del marcador', 'Marker height'),
          descriptions: text('Alto del marcador verde.', 'Green marker height.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['intersection.markerHeightMm'],
          minimum: 25,
          maximum: 25,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'markerOffsetMm',
          names: text('Retiro del marcador', 'Marker offset'),
          descriptions: text(
            'Distancia gráfica usada para colocar el marcador antes del cruce.',
            'Drawing distance used to position the marker before the crossing.',
          ),
          defaultValue: 25,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'intersection.markerWidthMm',
      'intersection.markerHeightMm',
      'intersection.branchCountMin',
      'intersection.branchCountMax',
      'intersection.branchAngleDeg',
      'intersection.allowedInEvacuation',
    ],
    advice: text(
      'Comprueba la perpendicularidad antes de ubicar el marcador.',
      'Check perpendicularity before placing the marker.',
    ),
    svgDescriptor: threeWayIntersectionDescriptor,
  }),
  item({
    id: 'fourWayIntersection',
    category: 'intersection',
    kind: 'tile',
    names: text('Intersección de cuatro vías', 'Four-way intersection'),
    descriptions: text(
      'Cruce perpendicular completo con marcador direccional.',
      'Complete perpendicular crossing with a direction marker.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      markerWidthMm: 25,
      markerHeightMm: 25,
    },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'branchCount',
          names: text('Cantidad de ramas', 'Branch count'),
          descriptions: text('Cantidad exacta de ramas.', 'Exact number of branches.'),
          defaultValue: 4,
          unit: 'count',
          ruleIds: ['intersection.branchCountMin', 'intersection.branchCountMax'],
          minimum: 3,
          maximum: 4,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'markerOffsetMm',
          names: text('Retiro del marcador', 'Marker offset'),
          descriptions: text(
            'Posición gráfica del marcador antes del cruce.',
            'Drawing position of the marker before the crossing.',
          ),
          defaultValue: 25,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'intersection.markerWidthMm',
      'intersection.markerHeightMm',
      'intersection.branchCountMin',
      'intersection.branchCountMax',
      'intersection.branchAngleDeg',
      'intersection.allowedInEvacuation',
    ],
    advice: text(
      'Marca el centro geométrico y proyecta desde allí las cuatro ramas.',
      'Mark the geometric centre and project all four branches from it.',
    ),
    svgDescriptor: fourWayIntersectionDescriptor,
  }),
  item({
    id: 'plainFourWayIntersection',
    category: 'intersection',
    kind: 'tile',
    names: text('Cruce sin marcador', 'Unmarked four-way crossing'),
    descriptions: text(
      'Cruce perpendicular de cuatro ramas sin marcador verde; el robot sigue derecho.',
      'Perpendicular four-branch crossing without a green marker; the robot continues straight.',
    ),
    nominalDimensions: { widthMm: 300, heightMm: 300 },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'branchCount',
          names: text('Cantidad de ramas', 'Branch count'),
          descriptions: text('Cantidad exacta de ramas.', 'Exact number of branches.'),
          defaultValue: 4,
          unit: 'count',
          ruleIds: ['intersection.branchCountMin', 'intersection.branchCountMax'],
          minimum: 4,
          maximum: 4,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'intersection.branchCountMin',
      'intersection.branchCountMax',
      'intersection.branchAngleDeg',
      'intersection.allowedInEvacuation',
    ],
    advice: text(
      'No añadas marcadores verdes: sin un marcador, el robot debe continuar derecho.',
      'Do not add green markers: without a marker, the robot must continue straight.',
    ),
    svgDescriptor: plainFourWayIntersectionDescriptor,
  }),
  item({
    id: 'startTile',
    category: 'intersection',
    kind: 'tile',
    names: text('Inicio', 'Start tile'),
    descriptions: text(
      'Punto de inicio y checkpoint con una intersección en T negra.',
      'Start and checkpoint with a black T intersection.',
    ),
    nominalDimensions: { widthMm: 300, heightMm: 300 },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'branchCount',
          names: text('Cantidad de ramas', 'Branch count'),
          descriptions: text('Cantidad de ramas de la T.', 'Number of branches in the T.'),
          defaultValue: 3,
          unit: 'count',
          ruleIds: ['intersection.branchCountMin', 'intersection.branchCountMax'],
          minimum: 3,
          maximum: 3,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'intersection.branchCountMin',
      'intersection.branchCountMax',
      'intersection.branchAngleDeg',
      'intersection.allowedInEvacuation',
    ],
    advice: text(
      'Ubícalo como checkpoint de inicio y orienta la T hacia el primer tramo de la ruta.',
      'Place it as the start checkpoint and orient the T toward the first route segment.',
    ),
    svgDescriptor: startTileDescriptor,
  }),
  item({
    id: 'deadEndIntersection',
    category: 'intersection',
    kind: 'tile',
    names: text('Retorno en intersección', 'Dead-end intersection'),
    descriptions: text(
      'Intersección con dos marcadores verdes que ordenan retornar.',
      'Intersection with two green markers indicating a turnaround.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      markerWidthMm: 25,
      markerHeightMm: 25,
      markerCount: 2,
    },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'markerCount',
          names: text('Cantidad de marcadores', 'Marker count'),
          descriptions: text(
            'Marcadores verdes requeridos para el retorno.',
            'Green markers required for the turnaround.',
          ),
          defaultValue: 2,
          unit: 'count',
          ruleIds: ['intersection.deadEndMarkerCount'],
          minimum: 2,
          maximum: 2,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'markerOffsetMm',
          names: text('Retiro del marcador', 'Marker offset'),
          descriptions: text(
            'Separación de dibujo previa al cruce.',
            'Drawing separation before the crossing.',
          ),
          defaultValue: 25,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'intersection.markerWidthMm',
      'intersection.markerHeightMm',
      'intersection.deadEndMarkerCount',
      'intersection.branchAngleDeg',
      'intersection.allowedInEvacuation',
    ],
    advice: text(
      'Alinea ambos marcadores antes de fijarlos para que la intención sea inequívoca.',
      'Align both markers before fixing them so the instruction is unambiguous.',
    ),
    svgDescriptor: deadEndIntersectionDescriptor,
  }),
  item({
    id: 'goalTile',
    category: 'line',
    kind: 'tile',
    names: text('Meta', 'Goal tile'),
    descriptions: text(
      'Baldosa final con franja roja perpendicular a la línea entrante.',
      'Final tile with a red strip perpendicular to the incoming line.',
    ),
    nominalDimensions: {
      widthMm: 300,
      heightMm: 300,
      tapeWidthMm: 25,
      tapeLengthMm: 300,
    },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'tapeWidthMm',
          names: text('Ancho de cinta roja', 'Red tape width'),
          descriptions: text('Ancho nominal de la meta.', 'Nominal goal strip width.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['goalTape.widthMm'],
          minimum: 25,
          maximum: 25,
        }),
        normative({
          id: 'tapeLengthMm',
          names: text('Largo de cinta roja', 'Red tape length'),
          descriptions: text('Largo nominal de la meta.', 'Nominal goal strip length.'),
          defaultValue: 300,
          unit: 'mm',
          ruleIds: ['goalTape.lengthMm'],
          minimum: 300,
          maximum: 300,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'goalTape.widthMm',
      'goalTape.lengthMm',
    ],
    advice: text(
      'Centra la franja y verifica con una escuadra su perpendicularidad.',
      'Centre the strip and use a square to verify perpendicularity.',
    ),
    svgDescriptor: goalTileDescriptor,
  }),
  item({
    id: 'speedBump',
    category: 'hazard',
    kind: 'structure',
    names: text('Resalto', 'Speed bump'),
    descriptions: text(
      'Elemento blanco elevado que puede cubrir la línea.',
      'Raised white element that may cover the line.',
    ),
    nominalDimensions: { widthMm: 300, depthMm: 300, heightMm: 10 },
    parameters: {
      normative: [
        normative({
          id: 'widthMm',
          names: text('Ancho máximo', 'Maximum width'),
          descriptions: text('Ancho máximo permitido.', 'Maximum permitted width.'),
          defaultValue: 300,
          unit: 'mm',
          ruleIds: ['speedBump.widthMaxMm'],
          maximum: 300,
        }),
        normative({
          id: 'depthMm',
          names: text('Profundidad máxima', 'Maximum depth'),
          descriptions: text('Profundidad máxima permitida.', 'Maximum permitted depth.'),
          defaultValue: 300,
          unit: 'mm',
          ruleIds: ['speedBump.depthMaxMm'],
          maximum: 300,
        }),
        normative({
          id: 'heightMm',
          names: text('Altura máxima', 'Maximum height'),
          descriptions: text('Altura máxima permitida.', 'Maximum permitted height.'),
          defaultValue: 10,
          unit: 'mm',
          ruleIds: ['speedBump.heightMaxMm'],
          maximum: 10,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'cornerRadiusMm',
          names: text('Radio de esquina', 'Corner radius'),
          descriptions: text(
            'Redondeo constructivo sin valor reglamentario.',
            'Construction rounding without a rules value.',
          ),
          defaultValue: 12,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: ['speedBump.widthMaxMm', 'speedBump.depthMaxMm', 'speedBump.heightMaxMm'],
    advice: text(
      'Pinta de negro la porción que solape la línea y fija el resalto al piso.',
      'Colour the overlapping line portion black and secure the bump to the floor.',
    ),
    svgDescriptor: speedBumpDescriptor,
  }),
  item({
    id: 'debris',
    category: 'hazard',
    kind: 'structure',
    names: text('Escombros', 'Debris'),
    descriptions: text(
      'Conjunto de piezas pequeñas no fijadas al suelo.',
      'Group of small pieces that are not fixed to the floor.',
    ),
    nominalDimensions: { heightMm: 3, previewWidthMm: 80, previewDepthMm: 40 },
    parameters: {
      normative: [
        normative({
          id: 'heightMm',
          names: text('Altura máxima', 'Maximum height'),
          descriptions: text('Altura máxima de cada pieza.', 'Maximum height of each piece.'),
          defaultValue: 3,
          unit: 'mm',
          ruleIds: ['debris.heightMaxMm'],
          maximum: 3,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'previewWidthMm',
          names: text('Ancho de representación', 'Preview width'),
          descriptions: text(
            'Tamaño visual del boceto, sin significado reglamentario.',
            'Visual sketch size without rules significance.',
          ),
          defaultValue: 80,
          unit: 'mm',
          step: 1,
        }),
        construction({
          id: 'previewDepthMm',
          names: text('Fondo de representación', 'Preview depth'),
          descriptions: text(
            'Profundidad visual del boceto, sin significado reglamentario.',
            'Visual sketch depth without rules significance.',
          ),
          defaultValue: 40,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: ['debris.heightMaxMm'],
    advice: text(
      'Usa materiales pequeños y deja indicado en el plano que no deben fijarse.',
      'Use small materials and note on the plan that they must remain unfixed.',
    ),
    svgDescriptor: debrisDescriptor,
  }),
  item({
    id: 'obstacle',
    category: 'hazard',
    kind: 'structure',
    names: text('Obstáculo', 'Obstacle'),
    descriptions: text(
      'Volumen pesado alrededor del cual debe navegar el robot.',
      'Heavy volume that the robot must navigate around.',
    ),
    nominalDimensions: { widthMm: 150, depthMm: 150, heightMm: 150 },
    parameters: {
      normative: [
        normative({
          id: 'heightMm',
          names: text('Altura mínima', 'Minimum height'),
          descriptions: text('Altura mínima reglamentaria.', 'Minimum rules height.'),
          defaultValue: 150,
          unit: 'mm',
          ruleIds: ['obstacle.heightMinMm'],
          minimum: 150,
        }),
        normative({
          id: 'edgeClearanceMm',
          names: text('Separación del borde', 'Edge clearance'),
          descriptions: text(
            'Separación mínima fuera de evacuación.',
            'Minimum clearance outside evacuation.',
          ),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['obstacle.edgeClearanceMinMm'],
          minimum: 250,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'footprintWidthMm',
          names: text('Ancho de huella', 'Footprint width'),
          descriptions: text(
            'Ancho elegido para representar el obstáculo.',
            'Width selected to represent the obstacle.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
        construction({
          id: 'footprintDepthMm',
          names: text('Fondo de huella', 'Footprint depth'),
          descriptions: text(
            'Fondo elegido para representar el obstáculo.',
            'Depth selected to represent the obstacle.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'obstacle.heightMinMm',
      'obstacle.edgeClearanceMinMm',
      'obstacle.evacuationWallClearanceMinMm',
    ],
    advice: text(
      'Anota si quedará fijo y comprueba todas las separaciones en planta.',
      'Note whether it will be fixed and verify every clearance in plan view.',
    ),
    svgDescriptor: obstacleDescriptor,
  }),
  item({
    id: 'ramp',
    category: 'level',
    kind: 'structure',
    names: text('Rampa', 'Ramp'),
    descriptions: text(
      'Baldosa inclinada para conectar niveles.',
      'Inclined tile used to connect levels.',
    ),
    nominalDimensions: { widthMm: 300, runLengthMm: 300, inclineDeg: 20 },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        normative({
          id: 'inclineDeg',
          names: text('Inclinación', 'Incline'),
          descriptions: text(
            'Ángulo respecto de la horizontal.',
            'Angle measured from horizontal.',
          ),
          defaultValue: 20,
          unit: 'degree',
          ruleIds: ['ramp.inclineMaxDeg'],
          maximum: 25,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'supportThicknessMm',
          names: text('Espesor de soporte', 'Support thickness'),
          descriptions: text(
            'Espesor elegido para la estructura, no prescrito por las reglas.',
            'Chosen structural thickness, not prescribed by the rules.',
          ),
          defaultValue: 12,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'ramp.inclineMaxDeg',
      'ramp.immediatePeakAllowed',
    ],
    advice: text(
      'Calcula la elevación desde el ángulo y evita un pico inmediato al terminar.',
      'Calculate elevation from the angle and avoid an immediate peak at the end.',
    ),
    svgDescriptor: rampDescriptor,
  }),
  item({
    id: 'bridge',
    category: 'level',
    kind: 'structure',
    names: text('Puente', 'Bridge'),
    descriptions: text(
      'Baldosa superior con paso libre para otra trayectoria.',
      'Upper tile with clear passage for another path.',
    ),
    nominalDimensions: {
      widthMm: 300,
      depthMm: 300,
      clearanceHeightMm: 250,
      passageWidthMm: 250,
    },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        normative({
          id: 'clearanceHeightMm',
          names: text('Altura libre', 'Clearance height'),
          descriptions: text('Altura mínima bajo el puente.', 'Minimum height under the bridge.'),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['bridge.clearanceHeightMinMm'],
          minimum: 250,
        }),
        normative({
          id: 'passageWidthMm',
          names: text('Ancho libre', 'Passage width'),
          descriptions: text(
            'Ancho mínimo de entrada o salida.',
            'Minimum entrance or exit width.',
          ),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['bridge.passageWidthMinMm'],
          minimum: 250,
        }),
        normative({
          id: 'pillarWidthMm',
          names: text('Ancho de pilar', 'Pillar width'),
          descriptions: text('Lado máximo del pilar cuadrado.', 'Maximum square pillar side.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['bridge.pillarWidthMaxMm'],
          maximum: 25,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'deckThicknessMm',
          names: text('Espesor del tablero', 'Deck thickness'),
          descriptions: text(
            'Espesor elegido para fabricación.',
            'Thickness selected for fabrication.',
          ),
          defaultValue: 12,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'bridge.pillarWidthMaxMm',
      'bridge.passageWidthMinMm',
      'bridge.clearanceHeightMinMm',
    ],
    advice: text(
      'Mide el paso libre terminado, incluyendo el espesor real del tablero.',
      'Measure finished clearance, including the actual deck thickness.',
    ),
    svgDescriptor: bridgeDescriptor,
  }),
  item({
    id: 'pillar',
    category: 'level',
    kind: 'structure',
    names: text('Pilar', 'Pillar'),
    descriptions: text(
      'Soporte cuadrado ubicado en una esquina de baldosa elevada.',
      'Square support placed at an elevated tile corner.',
    ),
    nominalDimensions: { widthMm: 25, depthMm: 25, heightMm: 250 },
    parameters: {
      normative: [
        normative({
          id: 'widthMm',
          names: text('Ancho del pilar', 'Pillar width'),
          descriptions: text('Lado máximo de la sección.', 'Maximum cross-section side.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['bridge.pillarWidthMaxMm'],
          maximum: 25,
        }),
        normative({
          id: 'heightMm',
          names: text('Altura útil', 'Useful height'),
          descriptions: text(
            'Altura libre mínima que debe permitir.',
            'Minimum clearance it must allow.',
          ),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['bridge.clearanceHeightMinMm'],
          minimum: 250,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: ['bridge.pillarWidthMaxMm', 'bridge.clearanceHeightMinMm'],
    advice: text(
      'Considera el espesor del tablero al cortar la altura del pilar.',
      'Account for deck thickness when cutting the pillar height.',
    ),
    svgDescriptor: pillarDescriptor,
  }),
  item({
    id: 'seesaw',
    category: 'level',
    kind: 'structure',
    names: text('Balancín', 'Seesaw'),
    descriptions: text(
      'Baldosa pivotante con bisagra central y línea recta.',
      'Pivoting tile with a central hinge and straight line.',
    ),
    nominalDimensions: { widthMm: 300, depthMm: 300, inclineDeg: 15 },
    parameters: {
      normative: [
        tileWidth,
        tileHeight,
        lineWidth,
        normative({
          id: 'inclineDeg',
          names: text('Inclinación de extremo', 'End incline'),
          descriptions: text(
            'Ángulo máximo exclusivo al inclinarse.',
            'Exclusive maximum angle when tilted.',
          ),
          defaultValue: 15,
          unit: 'degree',
          ruleIds: ['seesaw.inclineExclusiveMaxDeg'],
          maximumExclusive: 20,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'hingeOffsetMm',
          names: text('Posición de bisagra', 'Hinge position'),
          descriptions: text(
            'Distancia constructiva al centro de la baldosa.',
            'Construction distance to the tile centre.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'field.tileWidthMm',
      'field.tileHeightMm',
      'line.widthMinMm',
      'line.widthMaxMm',
      'seesaw.inclineExclusiveMaxDeg',
      'seesaw.lineMustBeStraight',
      'seesaw.scoringElementsAllowed',
    ],
    advice: text(
      'Prueba ambos extremos y confirma que ninguno alcance 20 grados.',
      'Test both ends and confirm that neither reaches 20 degrees.',
    ),
    svgDescriptor: seesawDescriptor,
  }),
  item({
    id: 'checkpoint',
    category: 'marker',
    kind: 'marker',
    names: text('Marcador de checkpoint', 'Checkpoint marker'),
    descriptions: text(
      'Disco de referencia humana para señalar una baldosa de reinicio.',
      'Human-readable disk used to mark a restart tile.',
    ),
    nominalDimensions: { diameterMm: 70, thicknessMm: 8 },
    parameters: {
      normative: [
        normative({
          id: 'diameterMm',
          names: text('Diámetro', 'Diameter'),
          descriptions: text('Diámetro máximo del disco habitual.', 'Maximum usual disk diameter.'),
          defaultValue: 70,
          unit: 'mm',
          ruleIds: ['checkpointMarker.diameterMaxMm'],
          maximum: 70,
        }),
        normative({
          id: 'thicknessMm',
          names: text('Espesor', 'Thickness'),
          descriptions: text(
            'Rango de espesor del marcador habitual.',
            'Usual marker thickness range.',
          ),
          defaultValue: 8,
          unit: 'mm',
          ruleIds: ['checkpointMarker.thicknessMinMm', 'checkpointMarker.thicknessMaxMm'],
          minimum: 5,
          maximum: 12,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'checkpointMarker.diameterMaxMm',
      'checkpointMarker.thicknessMinMm',
      'checkpointMarker.thicknessMaxMm',
    ],
    advice: text(
      'Mantén el marcador visible sin convertirlo en un obstáculo del recorrido.',
      'Keep the marker visible without turning it into a course obstacle.',
    ),
    svgDescriptor: checkpointDescriptor,
  }),
  item({
    id: 'evacuationZone',
    category: 'evacuation',
    kind: 'zone',
    names: text('Zona de evacuación', 'Evacuation zone'),
    descriptions: text(
      'Área rectangular amurallada para localizar y clasificar víctimas.',
      'Walled rectangular area used to locate and classify victims.',
    ),
    nominalDimensions: { widthMm: 1_200, heightMm: 900, wallHeightMm: 100 },
    parameters: {
      normative: [
        normative({
          id: 'widthMm',
          names: text('Ancho', 'Width'),
          descriptions: text('Ancho nominal de la zona.', 'Nominal zone width.'),
          defaultValue: 1_200,
          unit: 'mm',
          ruleIds: ['evacuation.widthMm'],
          minimum: 1_200,
          maximum: 1_200,
        }),
        normative({
          id: 'heightMm',
          names: text('Fondo', 'Depth'),
          descriptions: text('Fondo nominal de la zona.', 'Nominal zone depth.'),
          defaultValue: 900,
          unit: 'mm',
          ruleIds: ['evacuation.heightMm'],
          minimum: 900,
          maximum: 900,
        }),
        normative({
          id: 'wallHeightMm',
          names: text('Altura de muro', 'Wall height'),
          descriptions: text('Altura mínima de los muros.', 'Minimum wall height.'),
          defaultValue: 100,
          unit: 'mm',
          ruleIds: ['evacuation.wallHeightMinMm'],
          minimum: 100,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'openingCenterMm',
          names: text('Centro de abertura', 'Opening centre'),
          descriptions: text(
            'Ubicación de fabricación elegida para la abertura.',
            'Fabrication location selected for the opening.',
          ),
          defaultValue: 450,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'evacuation.widthMm',
      'evacuation.heightMm',
      'evacuation.wallHeightMinMm',
      'obstacle.evacuationWallClearanceMinMm',
    ],
    advice: text(
      'Verifica las medidas interiores útiles después de montar los cuatro muros.',
      'Verify clear internal dimensions after assembling all four walls.',
    ),
    svgDescriptor: evacuationZoneDescriptor,
  }),
  item({
    id: 'evacuationEntrance',
    category: 'evacuation',
    kind: 'marker',
    names: text('Entrada de evacuación', 'Evacuation entrance'),
    descriptions: text(
      'Franja reflectante plateada donde termina la línea.',
      'Reflective silver strip where the line ends.',
    ),
    nominalDimensions: { tapeWidthMm: 25, tapeLengthMm: 250 },
    parameters: {
      normative: [
        normative({
          id: 'tapeWidthMm',
          names: text('Ancho de cinta', 'Tape width'),
          descriptions: text('Ancho nominal de la franja.', 'Nominal strip width.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['evacuation.entranceTapeWidthMm'],
          minimum: 25,
          maximum: 25,
        }),
        normative({
          id: 'tapeLengthMm',
          names: text('Largo de cinta', 'Tape length'),
          descriptions: text('Largo nominal de la franja.', 'Nominal strip length.'),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['evacuation.entranceTapeLengthMm'],
          minimum: 250,
          maximum: 250,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'tapeCenterMm',
          names: text('Centro de cinta', 'Tape centre'),
          descriptions: text(
            'Eje constructivo para centrar la franja.',
            'Construction axis used to centre the strip.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'evacuation.entranceTapeWidthMm',
      'evacuation.entranceTapeLengthMm',
      'evacuation.lineEndsAtEntrance',
    ],
    advice: text(
      'Usa material reflectante uniforme y deja la línea terminando en la entrada.',
      'Use uniform reflective material and end the line at the entrance.',
    ),
    svgDescriptor: evacuationEntranceDescriptor,
  }),
  item({
    id: 'evacuationExit',
    category: 'evacuation',
    kind: 'marker',
    names: text('Salida de evacuación', 'Evacuation exit'),
    descriptions: text(
      'Franja negra donde la línea vuelve a comenzar.',
      'Black strip where the line begins again.',
    ),
    nominalDimensions: { tapeWidthMm: 25, tapeLengthMm: 250 },
    parameters: {
      normative: [
        normative({
          id: 'tapeWidthMm',
          names: text('Ancho de cinta', 'Tape width'),
          descriptions: text('Ancho nominal de la franja.', 'Nominal strip width.'),
          defaultValue: 25,
          unit: 'mm',
          ruleIds: ['evacuation.exitTapeWidthMm'],
          minimum: 25,
          maximum: 25,
        }),
        normative({
          id: 'tapeLengthMm',
          names: text('Largo de cinta', 'Tape length'),
          descriptions: text('Largo nominal de la franja.', 'Nominal strip length.'),
          defaultValue: 250,
          unit: 'mm',
          ruleIds: ['evacuation.exitTapeLengthMm'],
          minimum: 250,
          maximum: 250,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'tapeCenterMm',
          names: text('Centro de cinta', 'Tape centre'),
          descriptions: text(
            'Eje constructivo para centrar la franja.',
            'Construction axis used to centre the strip.',
          ),
          defaultValue: 150,
          unit: 'mm',
          step: 1,
        }),
      ],
    },
    ruleIds: [
      'evacuation.exitTapeWidthMm',
      'evacuation.exitTapeLengthMm',
      'evacuation.lineResumesAtExit',
    ],
    advice: text(
      'Alinea el reinicio de la línea con el centro de la franja negra.',
      'Align the resumed line with the centre of the black strip.',
    ),
    svgDescriptor: evacuationExitDescriptor,
  }),
  item({
    id: 'livingSafePoint',
    category: 'evacuation',
    kind: 'structure',
    names: text('Punto seguro verde', 'Green safe point'),
    descriptions: text(
      'Triángulo hueco para depositar víctimas vivas.',
      'Hollow triangle for living victims.',
    ),
    nominalDimensions: { legLengthMm: 300, wallWidthMm: 60 },
    parameters: {
      normative: [
        normative({
          id: 'legLengthMm',
          names: text('Lado del triángulo', 'Triangle leg'),
          descriptions: text('Largo nominal de ambos catetos.', 'Nominal length of both legs.'),
          defaultValue: 300,
          unit: 'mm',
          ruleIds: ['evacuation.pointLegLengthMm'],
          minimum: 300,
          maximum: 300,
        }),
        normative({
          id: 'wallWidthMm',
          names: text('Ancho de muro', 'Wall width'),
          descriptions: text('Ancho nominal de los muros.', 'Nominal wall width.'),
          defaultValue: 60,
          unit: 'mm',
          ruleIds: ['evacuation.pointWallWidthMm'],
          minimum: 60,
          maximum: 60,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'orientationDeg',
          names: text('Orientación', 'Orientation'),
          descriptions: text(
            'Rotación de colocación en una esquina válida.',
            'Placement rotation in a valid corner.',
          ),
          defaultValue: 0,
          unit: 'degree',
          step: 90,
        }),
      ],
    },
    ruleIds: ['evacuation.pointLegLengthMm', 'evacuation.pointWallWidthMm'],
    advice: text(
      'Conserva el centro hueco y fija el triángulo sin invadir entrada o salida.',
      'Keep the centre hollow and secure the triangle away from entrance and exit.',
    ),
    svgDescriptor: livingSafePointDescriptor,
  }),
  item({
    id: 'deadSafePoint',
    category: 'evacuation',
    kind: 'structure',
    names: text('Punto seguro rojo', 'Red safe point'),
    descriptions: text(
      'Triángulo hueco para depositar la víctima muerta.',
      'Hollow triangle for the dead victim.',
    ),
    nominalDimensions: { legLengthMm: 300, wallWidthMm: 60 },
    parameters: {
      normative: [
        normative({
          id: 'legLengthMm',
          names: text('Lado del triángulo', 'Triangle leg'),
          descriptions: text('Largo nominal de ambos catetos.', 'Nominal length of both legs.'),
          defaultValue: 300,
          unit: 'mm',
          ruleIds: ['evacuation.pointLegLengthMm'],
          minimum: 300,
          maximum: 300,
        }),
        normative({
          id: 'wallWidthMm',
          names: text('Ancho de muro', 'Wall width'),
          descriptions: text('Ancho nominal de los muros.', 'Nominal wall width.'),
          defaultValue: 60,
          unit: 'mm',
          ruleIds: ['evacuation.pointWallWidthMm'],
          minimum: 60,
          maximum: 60,
        }),
      ],
      constructionParameter: [
        construction({
          id: 'orientationDeg',
          names: text('Orientación', 'Orientation'),
          descriptions: text(
            'Rotación de colocación en una esquina válida.',
            'Placement rotation in a valid corner.',
          ),
          defaultValue: 0,
          unit: 'degree',
          step: 90,
        }),
      ],
    },
    ruleIds: ['evacuation.pointLegLengthMm', 'evacuation.pointWallWidthMm'],
    advice: text(
      'Identifica el rojo con acabado mate y verifica el ancho de todos los muros.',
      'Use a matte red finish and verify every wall width.',
    ),
    svgDescriptor: deadSafePointDescriptor,
  }),
  item({
    id: 'livingVictim',
    category: 'victim',
    kind: 'victim',
    names: text('Víctima viva', 'Living victim'),
    descriptions: text(
      'Esfera plateada, reflectante y conductora.',
      'Silver, reflective, electrically conductive sphere.',
    ),
    nominalDimensions: { diameterMm: 45, weightGram: 60, courseCount: 2 },
    parameters: {
      normative: [
        normative({
          id: 'diameterMm',
          names: text('Diámetro', 'Diameter'),
          descriptions: text('Rango de diámetro permitido.', 'Permitted diameter range.'),
          defaultValue: 45,
          unit: 'mm',
          ruleIds: ['victim.diameterMinMm', 'victim.diameterMaxMm'],
          minimum: 40,
          maximum: 50,
        }),
        normative({
          id: 'weightGram',
          names: text('Peso', 'Weight'),
          descriptions: text('Peso máximo de la esfera.', 'Maximum sphere weight.'),
          defaultValue: 60,
          unit: 'gram',
          ruleIds: ['victim.weightMaxGram'],
          maximum: 80,
        }),
        normative({
          id: 'courseCount',
          names: text('Cantidad en pista', 'Course count'),
          descriptions: text('Cantidad exacta de víctimas vivas.', 'Exact living victim count.'),
          defaultValue: 2,
          unit: 'count',
          ruleIds: ['victim.livingCount'],
          minimum: 2,
          maximum: 2,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'victim.diameterMinMm',
      'victim.diameterMaxMm',
      'victim.weightMaxGram',
      'victim.livingCount',
    ],
    advice: text(
      'Comprueba reflectividad, conductividad y centro de masa descentrado.',
      'Check reflectivity, conductivity, and the off-centre mass.',
    ),
    svgDescriptor: livingVictimDescriptor,
  }),
  item({
    id: 'deadVictim',
    category: 'victim',
    kind: 'victim',
    names: text('Víctima muerta', 'Dead victim'),
    descriptions: text(
      'Esfera negra y no conductora.',
      'Black, electrically non-conductive sphere.',
    ),
    nominalDimensions: { diameterMm: 45, weightGram: 60, courseCount: 1 },
    parameters: {
      normative: [
        normative({
          id: 'diameterMm',
          names: text('Diámetro', 'Diameter'),
          descriptions: text('Rango de diámetro permitido.', 'Permitted diameter range.'),
          defaultValue: 45,
          unit: 'mm',
          ruleIds: ['victim.diameterMinMm', 'victim.diameterMaxMm'],
          minimum: 40,
          maximum: 50,
        }),
        normative({
          id: 'weightGram',
          names: text('Peso', 'Weight'),
          descriptions: text('Peso máximo de la esfera.', 'Maximum sphere weight.'),
          defaultValue: 60,
          unit: 'gram',
          ruleIds: ['victim.weightMaxGram'],
          maximum: 80,
        }),
        normative({
          id: 'courseCount',
          names: text('Cantidad en pista', 'Course count'),
          descriptions: text('Cantidad exacta de víctimas muertas.', 'Exact dead victim count.'),
          defaultValue: 1,
          unit: 'count',
          ruleIds: ['victim.deadCount'],
          minimum: 1,
          maximum: 1,
        }),
      ],
      constructionParameter: [],
    },
    ruleIds: [
      'victim.diameterMinMm',
      'victim.diameterMaxMm',
      'victim.weightMaxGram',
      'victim.deadCount',
    ],
    advice: text(
      'Usa una superficie negra uniforme y confirma que no sea conductora.',
      'Use a uniform black surface and confirm that it is non-conductive.',
    ),
    svgDescriptor: deadVictimDescriptor,
  }),
];

export const rescueSketchCatalog = catalogSchema.parse({
  catalogVersion,
  rulesetVersion: rescueLine2026Ruleset.rulesetVersion,
  sourceId: catalogSourceId,
  items: catalogItems,
});

const catalogItemsById = new Map(
  rescueSketchCatalog.items.map((catalogItem) => [catalogItem.id, catalogItem] as const),
);

export const rescueSketchCatalogIds = Object.freeze([...catalogItemsById.keys()]);

export function getCatalogItem(catalogItemId: string): CatalogItem {
  const catalogItem = catalogItemsById.get(catalogItemId);

  if (catalogItem === undefined) {
    throw new RangeError(`Unknown RescueSketch catalog item: ${catalogItemId}`);
  }

  return catalogItem;
}

export function getCatalogItemsByCategory(
  category: CatalogItem['category'],
): readonly CatalogItem[] {
  return rescueSketchCatalog.items.filter((catalogItem) => catalogItem.category === category);
}
