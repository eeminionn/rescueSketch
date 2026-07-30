import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { serializeTrackDocument, type TrackDocumentV1 } from '../../domain';
import { EditorRecoveryRepository, type EditorRecoveryRecord } from '../persistence/editorRecovery';

export const defaultEditorRecoveryDebounceMs = 750;
export const maximumEditorRecoveryDebounceMs = 60_000;

export type EditorRecoveryStatus = 'loading' | 'recovered' | 'saving' | 'saved' | 'error';

export interface UseEditorRecoveryOptions {
  trackId: string;
  document: TrackDocumentV1;
  revision: number;
  onRecover: (record: EditorRecoveryRecord) => void | Promise<void>;
  debounceMs?: number;
}

export interface UseEditorRecoveryResult {
  status: EditorRecoveryStatus;
  saveNow: () => Promise<boolean>;
}

interface CurrentEditorInput {
  trackId: string;
  document: TrackDocumentV1;
  revision: number;
}

interface ActiveRepository {
  generation: number;
  repository: EditorRecoveryRepository;
}

interface StartupTask {
  generation: number;
  promise: Promise<boolean>;
}

function normalizeDebounceMs(debounceMs: number | undefined): number {
  if (debounceMs === undefined || !Number.isFinite(debounceMs)) {
    return defaultEditorRecoveryDebounceMs;
  }

  return Math.min(maximumEditorRecoveryDebounceMs, Math.max(0, Math.round(debounceMs)));
}

function createInputKey(document: TrackDocumentV1, revision: number): string {
  return `${revision}:${serializeTrackDocument(document)}`;
}

function createDocumentKey(document: TrackDocumentV1): string {
  return serializeTrackDocument(document);
}

export function useEditorRecovery({
  trackId,
  document,
  revision,
  onRecover,
  debounceMs,
}: UseEditorRecoveryOptions): UseEditorRecoveryResult {
  const [status, setStatus] = useState<EditorRecoveryStatus>('loading');
  const [readyGeneration, setReadyGeneration] = useState<number | null>(null);
  const normalizedDebounceMs = useMemo(() => normalizeDebounceMs(debounceMs), [debounceMs]);
  const currentInputRef = useRef<CurrentEditorInput>({ trackId, document, revision });
  const onRecoverRef = useRef(onRecover);
  const generationRef = useRef(0);
  const activeRepositoryRef = useRef<ActiveRepository | null>(null);
  const startupTaskRef = useRef<StartupTask | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baselineInputKeyRef = useRef<string | null>(null);
  const recoveredDocumentKeyRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSaveRequestRef = useRef(0);

  currentInputRef.current = { trackId, document, revision };
  onRecoverRef.current = onRecover;

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const isCurrentGeneration = useCallback((generation: number): boolean => {
    return (
      generationRef.current === generation && activeRepositoryRef.current?.generation === generation
    );
  }, []);

  const saveCurrentInput = useCallback(
    async (generation: number): Promise<boolean> => {
      const activeRepository = activeRepositoryRef.current;
      const currentInput = currentInputRef.current;

      if (
        activeRepository?.generation !== generation ||
        generationRef.current !== generation ||
        currentInput.trackId !== trackId
      ) {
        return false;
      }

      const snapshot = currentInput;
      const requestId = latestSaveRequestRef.current + 1;
      latestSaveRequestRef.current = requestId;
      setStatus('saving');

      const queuedSave = saveQueueRef.current
        .catch(() => undefined)
        .then(async (): Promise<boolean> => {
          if (
            !isCurrentGeneration(generation) ||
            currentInputRef.current.trackId !== snapshot.trackId
          ) {
            return false;
          }

          try {
            await activeRepository.repository.save({
              trackId: snapshot.trackId,
              document: snapshot.document,
              revision: snapshot.revision,
              savedAt: new Date().toISOString(),
            });

            baselineInputKeyRef.current = createInputKey(snapshot.document, snapshot.revision);

            if (isCurrentGeneration(generation) && latestSaveRequestRef.current === requestId) {
              setStatus('saved');
            }

            return true;
          } catch {
            if (isCurrentGeneration(generation) && latestSaveRequestRef.current === requestId) {
              setStatus('error');
            }

            return false;
          }
        });

      saveQueueRef.current = queuedSave.then(() => undefined);
      return queuedSave;
    },
    [isCurrentGeneration, trackId],
  );

  const saveNow = useCallback(async (): Promise<boolean> => {
    clearDebounceTimer();

    const startupTask = startupTaskRef.current;

    if (startupTask === null || !(await startupTask.promise)) {
      return false;
    }

    return saveCurrentInput(startupTask.generation);
  }, [clearDebounceTimer, saveCurrentInput]);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    clearDebounceTimer();
    baselineInputKeyRef.current = null;
    recoveredDocumentKeyRef.current = null;
    setReadyGeneration(null);
    setStatus('loading');

    let cancelled = false;
    let repository: EditorRecoveryRepository;

    try {
      repository = new EditorRecoveryRepository();
    } catch {
      setStatus('error');
      startupTaskRef.current = {
        generation,
        promise: Promise.resolve(false),
      };

      return () => {
        cancelled = true;

        if (generationRef.current === generation) {
          generationRef.current += 1;
        }
      };
    }

    activeRepositoryRef.current = { generation, repository };

    const startupPromise = (async (): Promise<boolean> => {
      try {
        await repository.open();

        if (cancelled || !isCurrentGeneration(generation)) {
          repository.close();
          return false;
        }

        const recoveredRecord = await repository.load(trackId);

        if (cancelled || !isCurrentGeneration(generation)) {
          repository.close();
          return false;
        }

        const currentInput = currentInputRef.current;
        baselineInputKeyRef.current = createInputKey(currentInput.document, currentInput.revision);

        if (recoveredRecord !== null) {
          recoveredDocumentKeyRef.current = createDocumentKey(recoveredRecord.document);
          await onRecoverRef.current(recoveredRecord);

          if (cancelled || !isCurrentGeneration(generation)) {
            repository.close();
            return false;
          }

          setStatus('recovered');
        } else {
          setStatus('saved');
        }

        setReadyGeneration(generation);
        return true;
      } catch {
        repository.close();

        if (!cancelled && isCurrentGeneration(generation)) {
          setStatus('error');
        }

        return false;
      }
    })();

    startupTaskRef.current = { generation, promise: startupPromise };

    return () => {
      cancelled = true;
      clearDebounceTimer();
      repository.close();

      if (activeRepositoryRef.current?.generation === generation) {
        activeRepositoryRef.current = null;
      }

      if (startupTaskRef.current?.generation === generation) {
        startupTaskRef.current = null;
      }

      if (generationRef.current === generation) {
        generationRef.current += 1;
      }
    };
  }, [clearDebounceTimer, isCurrentGeneration, trackId]);

  useEffect(() => {
    if (readyGeneration === null || !isCurrentGeneration(readyGeneration)) {
      return;
    }

    const inputKey = createInputKey(document, revision);

    if (baselineInputKeyRef.current === inputKey) {
      return;
    }

    const recoveredDocumentKey = recoveredDocumentKeyRef.current;

    if (recoveredDocumentKey !== null && recoveredDocumentKey === createDocumentKey(document)) {
      recoveredDocumentKeyRef.current = null;
      baselineInputKeyRef.current = inputKey;
      return;
    }

    clearDebounceTimer();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void saveCurrentInput(readyGeneration);
    }, normalizedDebounceMs);

    return clearDebounceTimer;
  }, [
    clearDebounceTimer,
    document,
    isCurrentGeneration,
    normalizedDebounceMs,
    readyGeneration,
    revision,
    saveCurrentInput,
  ]);

  return useMemo(
    () => ({
      status,
      saveNow,
    }),
    [saveNow, status],
  );
}
