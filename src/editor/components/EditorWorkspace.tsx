import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';

import {
  getCatalogItem,
  rescueSketchCatalog,
  type CatalogCategory,
  type CatalogItem,
} from '../../catalog';
import {
  createEmptyTrackDocument,
  tileSizeMm,
  type Point,
  type TrackDocumentV1,
  type TrackStructure,
} from '../../domain';
import { rescueSketchI18n, type AppLanguage } from '../../i18n';
import { validateTrackDocument } from '../../validation';
import { useEditorRecovery } from '../recovery';
import { CatalogSvg } from '../rendering';
import { createEditorStore, type EditorStore } from '../state';
import styles from './editorWorkspace.module.css';
import { ValidationPanel } from './ValidationPanel';

const categoryOrder: readonly CatalogCategory[] = [
  'line',
  'intersection',
  'hazard',
  'level',
  'marker',
  'evacuation',
  'victim',
];

const structureKindByCatalogItemId: Readonly<Record<string, TrackStructure['kind']>> = {
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
};

const minimumZoom = 0.45;
const maximumZoom = 1.8;
const zoomStep = 0.15;

export interface EditorWorkspaceProps {
  initialDocument?: TrackDocumentV1;
  onExit: () => void;
  trackId?: string;
}

interface PaletteItemProps {
  item: CatalogItem;
  language: AppLanguage;
  onAdd: (catalogItemId: string) => void;
}

interface CanvasElementProps {
  editorStore: EditorStore;
  elementId: string;
  catalogItem: CatalogItem;
  position: Point;
  rotation: number;
  selected: boolean;
  language: AppLanguage;
}

interface DragData {
  catalogItemId?: string;
  elementId?: string;
  sourceType: 'catalog' | 'element';
}

function createElementId(catalogItemId: string): string {
  const uniquePart =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return `${catalogItemId}-${uniquePart}`;
}

function getDefaultParameters(item: CatalogItem): Record<string, number> {
  return Object.fromEntries(
    [...item.parameters.normative, ...item.parameters.constructionParameter].map((parameter) => [
      parameter.id,
      parameter.defaultValue,
    ]),
  );
}

function getNextPosition(document: TrackDocumentV1): Point {
  const elementCount = document.tiles.length + document.structures.length;
  const columns = Math.max(1, Math.floor(document.canvas.widthMm / tileSizeMm));

  return {
    x: (elementCount % columns) * tileSizeMm,
    y: Math.floor(elementCount / columns) * tileSizeMm,
  };
}

function getElementCatalogItem(document: TrackDocumentV1, elementId: string): CatalogItem | null {
  const tile = document.tiles.find(({ id }) => id === elementId);

  if (tile !== undefined) {
    try {
      return getCatalogItem(tile.catalogItemId);
    } catch {
      return null;
    }
  }

  const structure = document.structures.find(({ id }) => id === elementId);

  if (structure === undefined) {
    return null;
  }

  try {
    return getCatalogItem(
      Object.entries(structureKindByCatalogItemId).find(
        ([, structureKind]) => structureKind === structure.kind,
      )?.[0] ?? structure.kind,
    );
  } catch {
    return null;
  }
}

function insertCatalogItem(
  editorStore: EditorStore,
  catalogItemId: string,
  requestedPosition?: Point,
): boolean {
  const item = getCatalogItem(catalogItemId);
  const state = editorStore.getState();
  const position = requestedPosition ?? getNextPosition(state.document);
  const id = createElementId(catalogItemId);
  const parameters = getDefaultParameters(item);
  const structureKind = structureKindByCatalogItemId[catalogItemId];

  if (structureKind !== undefined) {
    return state.insertStructure({
      id,
      kind: structureKind,
      position,
      parameters,
      geometry: [
        {
          kind: 'line',
          start: { x: 0, y: 0 },
          end: {
            x: item.svgDescriptor.viewBox.width,
            y: item.svgDescriptor.viewBox.height,
          },
        },
      ],
    });
  }

  return state.insertTile({
    id,
    catalogItemId,
    position,
    parameters,
  });
}

function PaletteItem({ item, language, onAdd }: PaletteItemProps) {
  const { t } = useTranslation();
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `catalog:${item.id}`,
    data: {
      sourceType: 'catalog',
      catalogItemId: item.id,
    } satisfies DragData,
  });

  return (
    <article className={styles.paletteItem} data-dragging={isDragging || undefined}>
      <button
        {...attributes}
        {...listeners}
        aria-label={t('editor.dragItem', { name: item.names[language] })}
        className={styles.palettePreview}
        ref={setNodeRef}
        type="button"
      >
        <CatalogSvg decorative descriptor={item.svgDescriptor} selected={false} />
      </button>
      <div className={styles.paletteItemCopy}>
        <strong>{item.names[language]}</strong>
        <span>
          {item.nominalDimensions.widthMm ?? item.svgDescriptor.viewBox.width} ×{' '}
          {item.nominalDimensions.heightMm ?? item.svgDescriptor.viewBox.height} mm
        </span>
      </div>
      <button
        aria-label={t('editor.addItem', { name: item.names[language] })}
        className={styles.addItemButton}
        onClick={() => {
          onAdd(item.id);
        }}
        type="button"
      >
        +
      </button>
    </article>
  );
}

function CanvasElement({
  editorStore,
  elementId,
  catalogItem,
  position,
  rotation,
  selected,
  language,
}: CanvasElementProps) {
  const { t } = useTranslation();
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: `element:${elementId}`,
    data: {
      sourceType: 'element',
      elementId,
    } satisfies DragData,
  });
  const width = catalogItem.svgDescriptor.viewBox.width;
  const height = catalogItem.svgDescriptor.viewBox.height;
  const transform = [
    `translate(${position.x} ${position.y})`,
    `translate(${width / 2} ${height / 2})`,
    `rotate(${rotation * 90})`,
    `translate(${-width / 2} ${-height / 2})`,
  ].join(' ');

  return (
    <g
      {...attributes}
      {...listeners}
      aria-label={t('editor.canvasElementLabel', {
        name: catalogItem.names[language],
        x: position.x,
        y: position.y,
      })}
      className={styles.canvasElement}
      data-dragging={isDragging || undefined}
      data-selected={selected || undefined}
      onClick={(event) => {
        event.stopPropagation();
        editorStore.getState().setSelection([elementId], event.shiftKey ? 'toggle' : 'replace');
      }}
      onFocus={() => {
        if (!selected) {
          editorStore.getState().setSelection([elementId]);
        }
      }}
      ref={(node) => {
        setNodeRef(node as unknown as HTMLElement | null);
      }}
      role="button"
      tabIndex={0}
      transform={transform}
    >
      <CatalogSvg
        decorative
        descriptor={catalogItem.svgDescriptor}
        selected={selected}
        sizing="intrinsic"
      />
      {selected ? (
        <rect
          className={styles.selectionFrame}
          height={height}
          pointerEvents="none"
          width={width}
          x={0}
          y={0}
        />
      ) : null}
    </g>
  );
}

function LanguageButtons() {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es';

  return (
    <div aria-label={t('language.selectorLabel')} className={styles.languageButtons} role="group">
      {(['es', 'en'] as const).map((candidate) => (
        <button
          aria-label={
            candidate === 'es' ? t('language.selectSpanish') : t('language.selectEnglish')
          }
          aria-pressed={language === candidate}
          key={candidate}
          onClick={() => {
            void rescueSketchI18n.changeLanguage(candidate);
          }}
          type="button"
        >
          {candidate.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Inspector({
  editorStore,
  language,
  onClose,
}: {
  editorStore: EditorStore;
  language: AppLanguage;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const document = useStore(editorStore, (state) => state.document);
  const selectionIds = useStore(editorStore, (state) => state.selectionIds);
  const selectedId = selectionIds.length === 1 ? selectionIds[0] : undefined;
  const item = selectedId === undefined ? null : getElementCatalogItem(document, selectedId);
  const element =
    selectedId === undefined
      ? undefined
      : [...document.tiles, ...document.structures].find(({ id }) => id === selectedId);

  const updateParameter = (parameterId: string, value: number) => {
    if (element === undefined || selectedId === undefined || !Number.isFinite(value)) {
      return;
    }

    const update = <
      T extends { id: string; parameters: Record<string, string | number | boolean> },
    >(
      candidate: T,
    ): T =>
      candidate.id === selectedId
        ? {
            ...candidate,
            parameters: {
              ...candidate.parameters,
              [parameterId]: value,
            },
          }
        : candidate;

    editorStore.getState().replaceDocument(
      {
        ...document,
        tiles: document.tiles.map(update),
        structures: document.structures.map(update),
      },
      false,
    );
    editorStore.getState().setSelection([selectedId]);
  };

  return (
    <aside aria-label={t('editor.inspectorTitle')} className={styles.inspector}>
      <header className={styles.panelHeader}>
        <div>
          <span>{t('editor.inspectorEyebrow')}</span>
          <h2>{t('editor.inspectorTitle')}</h2>
        </div>
        <button aria-label={t('common.close')} onClick={onClose} type="button">
          ×
        </button>
      </header>

      {item === null || element === undefined ? (
        <div className={styles.inspectorEmpty}>
          <span aria-hidden="true">↖</span>
          <p>{t('editor.inspectorEmpty')}</p>
        </div>
      ) : (
        <div className={styles.inspectorContent}>
          <div className={styles.inspectorIdentity}>
            <CatalogSvg decorative descriptor={item.svgDescriptor} selected={false} />
            <div>
              <h3>{item.names[language]}</h3>
              <p>{item.descriptions[language]}</p>
            </div>
          </div>

          <section aria-labelledby="element-position-title">
            <h4 id="element-position-title">{t('editor.positionTitle')}</h4>
            <div className={styles.coordinateGrid}>
              {(['x', 'y'] as const).map((axis) => (
                <label key={axis}>
                  <span>{axis.toUpperCase()} (mm)</span>
                  <input
                    inputMode="decimal"
                    min={0}
                    onChange={(event) => {
                      const nextValue = Number(event.currentTarget.value);
                      editorStore.getState().moveElementTo(
                        element.id,
                        {
                          ...element.position,
                          [axis]: nextValue,
                        },
                        { snap: false },
                      );
                    }}
                    step={1}
                    type="number"
                    value={element.position[axis]}
                  />
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="element-measures-title">
            <h4 id="element-measures-title">{t('editor.measurementsTitle')}</h4>
            <dl className={styles.dimensionList}>
              {Object.entries(item.nominalDimensions).map(([dimension, value]) => (
                <div key={dimension}>
                  <dt>{t(`dimensions.${dimension}`, { defaultValue: dimension })}</dt>
                  <dd>{value} mm</dd>
                </div>
              ))}
            </dl>
          </section>

          {[...item.parameters.normative, ...item.parameters.constructionParameter].length > 0 ? (
            <section aria-labelledby="element-parameters-title">
              <h4 id="element-parameters-title">{t('editor.parametersTitle')}</h4>
              <div className={styles.parameterList}>
                {[...item.parameters.normative, ...item.parameters.constructionParameter].map(
                  (parameter) => (
                    <label key={parameter.id}>
                      <span>
                        {parameter.names[language]}
                        <small>
                          {parameter.parameterType === 'normative'
                            ? t('editor.normativeParameter')
                            : t('editor.fabricationParameter')}
                        </small>
                      </span>
                      <span className={styles.parameterInput}>
                        <input
                          inputMode="decimal"
                          max={
                            parameter.parameterType === 'normative' ? parameter.maximum : undefined
                          }
                          min={
                            parameter.parameterType === 'normative' ? parameter.minimum : undefined
                          }
                          onChange={(event) => {
                            updateParameter(parameter.id, Number(event.currentTarget.value));
                          }}
                          step={
                            parameter.parameterType === 'constructionParameter'
                              ? (parameter.step ?? 1)
                              : 1
                          }
                          type="number"
                          value={Number(element.parameters[parameter.id] ?? parameter.defaultValue)}
                        />
                        <em>{parameter.unit}</em>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="element-rules-title">
            <h4 id="element-rules-title">{t('editor.ruleReferencesTitle')}</h4>
            <ul className={styles.ruleList}>
              {item.ruleReferences.map((reference) => (
                <li key={reference.ruleId}>
                  <code>{reference.ruleId}</code>
                  <span>
                    § {reference.section} · {t('common.pageAbbreviation')} {reference.page}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="element-advice-title">
            <h4 id="element-advice-title">{t('editor.constructionAdviceTitle')}</h4>
            <p className={styles.advice}>{item.advice[language]}</p>
          </section>

          <div className={styles.inspectorActions}>
            <button
              onClick={() => {
                editorStore.getState().rotateSelection();
              }}
              type="button"
            >
              {t('editor.rotate')}
            </button>
            <button
              onClick={() => {
                editorStore.getState().duplicateSelection();
              }}
              type="button"
            >
              {t('editor.duplicate')}
            </button>
            <button
              className={styles.dangerButton}
              onClick={() => {
                editorStore.getState().deleteSelection();
              }}
              type="button"
            >
              {t('editor.delete')}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export function EditorWorkspace({
  initialDocument,
  onExit,
  trackId = 'local-track',
}: EditorWorkspaceProps) {
  const { t, i18n } = useTranslation();
  const language: AppLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'es';
  const editorStore = useMemo(
    () => createEditorStore(initialDocument ?? createEmptyTrackDocument(new Date().toISOString())),
    [initialDocument],
  );
  const document = useStore(editorStore, (state) => state.document);
  const selectionIds = useStore(editorStore, (state) => state.selectionIds);
  const activeLevelId = useStore(editorStore, (state) => state.activeLevelId);
  const history = useStore(editorStore, (state) => state.history);
  const revision = useStore(editorStore, (state) => state.revision);
  const [activeCategory, setActiveCategory] = useState<CatalogCategory>('line');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(0.75);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<CatalogItem | null>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const { isOver, setNodeRef: setCanvasDropRef } = useDroppable({ id: 'track-canvas' });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(language);

    return rescueSketchCatalog.items.filter(
      (item) =>
        item.category === activeCategory &&
        (normalizedQuery.length === 0 ||
          item.names[language].toLocaleLowerCase(language).includes(normalizedQuery) ||
          item.descriptions[language].toLocaleLowerCase(language).includes(normalizedQuery)),
    );
  }, [activeCategory, language, query]);

  const activeElements = useMemo(
    () =>
      [
        ...document.tiles.map((tile) => ({
          id: tile.id,
          catalogItemId: tile.catalogItemId,
          position: tile.position,
          rotation: tile.rotation,
          levelId: tile.levelId,
        })),
        ...document.structures.map((structure) => ({
          id: structure.id,
          catalogItemId:
            Object.entries(structureKindByCatalogItemId).find(
              ([, structureKind]) => structureKind === structure.kind,
            )?.[0] ?? structure.kind,
          position: structure.position,
          rotation: structure.rotation,
          levelId: structure.levelId,
        })),
      ].filter(({ levelId }) => levelId === activeLevelId),
    [activeLevelId, document.structures, document.tiles],
  );
  const validationReport = useMemo(() => validateTrackDocument(document), [document]);

  const { saveNow, status: recoveryStatus } = useEditorRecovery({
    trackId,
    document,
    revision,
    debounceMs: 650,
    onRecover: (record) => {
      editorStore.getState().replaceDocument(record.document);
    },
  });

  const handleEditorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.matches('input, textarea, select, [contenteditable="true"]')) {
      return;
    }

    const state = editorStore.getState();
    const modifier = event.metaKey || event.ctrlKey;

    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        state.redo();
      } else {
        state.undo();
      }
      return;
    }

    if (modifier && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      state.duplicateSelection();
      return;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      state.deleteSelection();
      return;
    }

    if (event.key === 'Escape') {
      state.clearSelection();
      return;
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      state.rotateSelection();
      return;
    }

    const movementByKey: Partial<Record<string, Point>> = {
      ArrowLeft: { x: -document.canvas.gridSizeMm, y: 0 },
      ArrowRight: { x: document.canvas.gridSizeMm, y: 0 },
      ArrowUp: { x: 0, y: -document.canvas.gridSizeMm },
      ArrowDown: { x: 0, y: document.canvas.gridSizeMm },
    };
    const movement = movementByKey[event.key];

    if (movement !== undefined && selectionIds.length > 0) {
      event.preventDefault();
      const multiplier = event.shiftKey ? 10 : 1;
      state.moveSelectionBy({
        x: movement.x * multiplier,
        y: movement.y * multiplier,
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData | undefined;

    if (dragData?.catalogItemId !== undefined) {
      setActiveDragItem(getCatalogItem(dragData.catalogItemId));
    } else if (dragData?.elementId !== undefined) {
      setActiveDragItem(getElementCatalogItem(document, dragData.elementId));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);

    if (event.over?.id !== 'track-canvas') {
      return;
    }

    const dragData = event.active.data.current as DragData | undefined;
    const viewport = canvasViewportRef.current;

    if (dragData === undefined || viewport === null) {
      return;
    }

    if (dragData.sourceType === 'element' && dragData.elementId !== undefined) {
      const millimetresPerPixel = document.canvas.widthMm / viewport.scrollWidth;
      editorStore.getState().setSelection([dragData.elementId]);
      editorStore.getState().moveSelectionBy({
        x: event.delta.x * millimetresPerPixel,
        y: event.delta.y * millimetresPerPixel,
      });
      return;
    }

    const translatedRect = event.active.rect.current.translated;
    const svg = viewport.querySelector('svg');

    if (dragData.catalogItemId === undefined || translatedRect === null || svg === null) {
      return;
    }

    const svgRect = svg.getBoundingClientRect();
    const relativeX = translatedRect.left + translatedRect.width / 2 - svgRect.left;
    const relativeY = translatedRect.top + translatedRect.height / 2 - svgRect.top;
    const position = {
      x: Math.max(0, (relativeX / svgRect.width) * document.canvas.widthMm - tileSizeMm / 2),
      y: Math.max(0, (relativeY / svgRect.height) * document.canvas.heightMm - tileSizeMm / 2),
    };

    insertCatalogItem(editorStore, dragData.catalogItemId, position);
  };

  const beginCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 1 && !event.altKey) {
      return;
    }

    const viewport = event.currentTarget;
    const pointerId = event.pointerId;
    const start = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
    viewport.setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) {
        viewport.scrollLeft = start.scrollLeft - (moveEvent.clientX - start.x);
        viewport.scrollTop = start.scrollTop - (moveEvent.clientY - start.y);
      }
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId === pointerId) {
        viewport.removeEventListener('pointermove', move);
        viewport.removeEventListener('pointerup', finish);
        viewport.removeEventListener('pointercancel', finish);
      }
    };

    viewport.addEventListener('pointermove', move);
    viewport.addEventListener('pointerup', finish);
    viewport.addEventListener('pointercancel', finish);
  };

  const canvasStyle = {
    '--canvas-height': `${(document.canvas.heightMm / 3) * zoom}px`,
    '--canvas-width': `${(document.canvas.widthMm / 3) * zoom}px`,
  } as CSSProperties;
  return (
    <DndContext
      onDragCancel={() => {
        setActiveDragItem(null);
      }}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div className={styles.editorRoot} onKeyDown={handleEditorKeyDown}>
        <div className={styles.phoneOnly}>
          <span className={styles.phoneBadge}>{t('common.brandInitials')}</span>
          <h1>{t('editor.phoneTitle')}</h1>
          <p>{t('editor.phoneDescription')}</p>
          <button onClick={onExit} type="button">
            {t('common.backToDashboard')}
          </button>
        </div>

        <div className={styles.desktopEditor}>
          <header className={styles.topbar}>
            <button
              aria-label={t('common.backToDashboard')}
              className={styles.brandButton}
              onClick={onExit}
              type="button"
            >
              <span aria-hidden="true">{t('common.brandInitials')}</span>
              <strong>{t('common.brandName')}</strong>
            </button>
            <div className={styles.trackIdentity}>
              <label>
                <span>{t('editor.trackNameLabel')}</span>
                <input
                  aria-label={t('editor.trackNameLabel')}
                  defaultValue={t('editor.untitledTrack')}
                />
              </label>
              <span>
                {document.canvas.widthMm} × {document.canvas.heightMm} mm
              </span>
            </div>
            <div className={styles.topbarActions}>
              <span aria-live="polite" className={styles.saveStatus}>
                {t(`editor.saveStatus.${recoveryStatus}`)}
              </span>
              <LanguageButtons />
              <button
                className={styles.saveButton}
                onClick={() => {
                  void saveNow();
                }}
                type="button"
              >
                {t('editor.saveLocally')}
              </button>
            </div>
          </header>

          <main className={styles.editorLayout}>
            <aside aria-label={t('editor.catalogTitle')} className={styles.catalogPanel}>
              <div className={styles.catalogHeader}>
                <div>
                  <span>{t('editor.libraryEyebrow')}</span>
                  <h2>{t('editor.catalogTitle')}</h2>
                </div>
                <span>{rescueSketchCatalog.items.length}</span>
              </div>
              <label className={styles.searchField}>
                <span className={styles.visuallyHidden}>{t('editor.searchCatalog')}</span>
                <span aria-hidden="true">⌕</span>
                <input
                  onChange={(event) => {
                    setQuery(event.currentTarget.value);
                  }}
                  placeholder={t('editor.searchCatalog')}
                  type="search"
                  value={query}
                />
              </label>
              <div
                aria-label={t('editor.categoryLabel')}
                className={styles.categoryTabs}
                role="tablist"
              >
                {categoryOrder.map((category) => (
                  <button
                    aria-selected={activeCategory === category}
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                    }}
                    role="tab"
                    type="button"
                  >
                    {t(`catalog.categories.${category}`)}
                  </button>
                ))}
              </div>
              <div className={styles.paletteList}>
                {visibleItems.map((item) => (
                  <PaletteItem
                    item={item}
                    key={item.id}
                    language={language}
                    onAdd={(catalogItemId) => {
                      insertCatalogItem(editorStore, catalogItemId);
                    }}
                  />
                ))}
                {visibleItems.length === 0 ? (
                  <p className={styles.noResults}>{t('editor.noCatalogResults')}</p>
                ) : null}
              </div>
              <p className={styles.dragHint}>{t('editor.dragHint')}</p>
            </aside>

            <section className={styles.canvasColumn}>
              <div className={styles.canvasToolbar}>
                <div className={styles.historyControls}>
                  <button
                    aria-label={t('editor.undo')}
                    disabled={history.past.length === 0}
                    onClick={() => {
                      editorStore.getState().undo();
                    }}
                    type="button"
                  >
                    ↶
                  </button>
                  <button
                    aria-label={t('editor.redo')}
                    disabled={history.future.length === 0}
                    onClick={() => {
                      editorStore.getState().redo();
                    }}
                    type="button"
                  >
                    ↷
                  </button>
                  <span />
                  <button
                    aria-label={t('editor.duplicate')}
                    disabled={selectionIds.length === 0}
                    onClick={() => {
                      editorStore.getState().duplicateSelection();
                    }}
                    type="button"
                  >
                    ⧉
                  </button>
                  <button
                    aria-label={t('editor.rotate')}
                    disabled={selectionIds.length === 0}
                    onClick={() => {
                      editorStore.getState().rotateSelection();
                    }}
                    type="button"
                  >
                    ↻
                  </button>
                  <button
                    aria-label={t('editor.delete')}
                    disabled={selectionIds.length === 0}
                    onClick={() => {
                      editorStore.getState().deleteSelection();
                    }}
                    type="button"
                  >
                    ⌫
                  </button>
                </div>

                <div className={styles.levelControls}>
                  <label>
                    <span>{t('editor.levelLabel')}</span>
                    <select
                      onChange={(event) => {
                        editorStore.getState().setActiveLevel(event.currentTarget.value);
                      }}
                      value={activeLevelId}
                    >
                      {document.levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name} · {level.elevationMm} mm
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    aria-label={t('editor.addLevel')}
                    onClick={() => {
                      const levelNumber = document.levels.length;
                      editorStore.getState().addLevel({
                        id: `level-${levelNumber}`,
                        name: t('editor.levelName', { number: levelNumber + 1 }),
                        elevationMm: levelNumber * 300,
                      });
                    }}
                    type="button"
                  >
                    +
                  </button>
                </div>

                <div className={styles.zoomControls}>
                  <button
                    aria-label={t('editor.zoomOut')}
                    disabled={zoom <= minimumZoom}
                    onClick={() => {
                      setZoom((current) => Math.max(minimumZoom, current - zoomStep));
                    }}
                    type="button"
                  >
                    −
                  </button>
                  <output aria-label={t('editor.zoomLevel')}>{Math.round(zoom * 100)}%</output>
                  <button
                    aria-label={t('editor.zoomIn')}
                    disabled={zoom >= maximumZoom}
                    onClick={() => {
                      setZoom((current) => Math.min(maximumZoom, current + zoomStep));
                    }}
                    type="button"
                  >
                    +
                  </button>
                  <button
                    aria-label={t('editor.toggleInspector')}
                    aria-pressed={inspectorOpen}
                    className={styles.inspectorToggle}
                    onClick={() => {
                      setInspectorOpen((current) => !current);
                    }}
                    type="button"
                  >
                    ⓘ
                  </button>
                </div>
              </div>

              <div
                aria-label={t('editor.canvasRegionLabel')}
                className={styles.canvasViewport}
                data-drop-active={isOver || undefined}
                onPointerDown={beginCanvasPan}
                ref={(node) => {
                  canvasViewportRef.current = node;
                  setCanvasDropRef(node);
                }}
                role="region"
                style={canvasStyle}
              >
                <div className={styles.rulerCorner}>mm</div>
                <svg
                  aria-label={t('editor.canvasLabel', {
                    width: document.canvas.widthMm,
                    height: document.canvas.heightMm,
                  })}
                  className={styles.trackCanvas}
                  height={document.canvas.heightMm}
                  onClick={() => {
                    editorStore.getState().clearSelection();
                  }}
                  role="img"
                  viewBox={`0 0 ${document.canvas.widthMm} ${document.canvas.heightMm}`}
                  width={document.canvas.widthMm}
                >
                  <defs>
                    <pattern
                      height={tileSizeMm}
                      id="tile-grid"
                      patternUnits="userSpaceOnUse"
                      width={tileSizeMm}
                    >
                      <rect
                        className={styles.tileGridCell}
                        height={tileSizeMm}
                        width={tileSizeMm}
                        x={0}
                        y={0}
                      />
                    </pattern>
                  </defs>
                  <rect className={styles.canvasSurface} height="100%" width="100%" x={0} y={0} />
                  <rect fill="url(#tile-grid)" height="100%" width="100%" x={0} y={0} />
                  {activeElements.map((element) => {
                    let catalogItem: CatalogItem;

                    try {
                      catalogItem = getCatalogItem(element.catalogItemId);
                    } catch {
                      return null;
                    }

                    return (
                      <CanvasElement
                        catalogItem={catalogItem}
                        editorStore={editorStore}
                        elementId={element.id}
                        key={element.id}
                        language={language}
                        position={element.position}
                        rotation={element.rotation}
                        selected={selectionIds.includes(element.id)}
                      />
                    );
                  })}
                </svg>
              </div>

              <ValidationPanel
                onSelectElement={(elementId) => {
                  editorStore.getState().setSelection([elementId]);
                  setInspectorOpen(true);
                }}
                report={validationReport}
              />
            </section>

            {inspectorOpen ? (
              <Inspector
                editorStore={editorStore}
                language={language}
                onClose={() => {
                  setInspectorOpen(false);
                }}
              />
            ) : null}
          </main>
        </div>
      </div>

      <DragOverlay>
        {activeDragItem === null ? null : (
          <div className={styles.dragOverlay}>
            <CatalogSvg decorative descriptor={activeDragItem.svgDescriptor} selected={false} />
            <strong>{activeDragItem.names[language]}</strong>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
