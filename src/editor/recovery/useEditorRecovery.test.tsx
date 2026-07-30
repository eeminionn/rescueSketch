import { act, renderHook, waitFor } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';

import { createEmptyTrackDocument, type TrackDocumentV1 } from '../../domain';
import { EditorRecoveryRepository } from '../persistence/editorRecovery';
import { useEditorRecovery } from './useEditorRecovery';

const acceptedAt = '2026-07-30T18:00:00-04:00';
const savedAt = '2026-07-30T18:30:00-04:00';

function resizeDocument(document: TrackDocumentV1, widthMm: number): TrackDocumentV1 {
  return {
    ...document,
    canvas: {
      ...document.canvas,
      widthMm,
    },
  };
}

async function openInspector(indexedDb: IDBFactory): Promise<EditorRecoveryRepository> {
  const repository = new EditorRecoveryRepository({ indexedDb });
  await repository.open();
  return repository;
}

describe('useEditorRecovery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a recovery record at startup without overwriting it', async () => {
    const indexedDb = new IDBFactory();
    vi.stubGlobal('indexedDB', indexedDb);
    const recoveredDocument = resizeDocument(createEmptyTrackDocument(acceptedAt), 2_700);
    const seedRepository = await openInspector(indexedDb);
    await seedRepository.save({
      trackId: 'track-recovered',
      document: recoveredDocument,
      revision: 7,
      savedAt,
    });
    seedRepository.close();
    const onRecover = vi.fn();

    const { result, rerender, unmount } = renderHook(
      ({ document, revision }: { document: TrackDocumentV1; revision: number }) =>
        useEditorRecovery({
          trackId: 'track-recovered',
          document,
          revision,
          onRecover,
          debounceMs: 10,
        }),
      {
        initialProps: {
          document: createEmptyTrackDocument(acceptedAt),
          revision: 0,
        },
      },
    );

    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('recovered');
    });
    expect(onRecover).toHaveBeenCalledWith(
      expect.objectContaining({
        trackId: 'track-recovered',
        document: recoveredDocument,
        revision: 7,
      }),
    );

    rerender({ document: recoveredDocument, revision: 7 });
    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
    expect(result.current.status).toBe('recovered');

    unmount();
  });

  it('debounces changed documents and stores only the latest revision', async () => {
    const indexedDb = new IDBFactory();
    vi.stubGlobal('indexedDB', indexedDb);
    const initialDocument = createEmptyTrackDocument(acceptedAt);
    const firstChange = resizeDocument(initialDocument, 2_700);
    const latestChange = resizeDocument(initialDocument, 3_000);

    const { result, rerender, unmount } = renderHook(
      ({ document, revision }: { document: TrackDocumentV1; revision: number }) =>
        useEditorRecovery({
          trackId: 'track-debounced',
          document,
          revision,
          onRecover: vi.fn(),
          debounceMs: 30,
        }),
      {
        initialProps: {
          document: initialDocument,
          revision: 0,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    rerender({ document: firstChange, revision: 1 });
    rerender({ document: latestChange, revision: 2 });

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    const inspector = await openInspector(indexedDb);
    await waitFor(async () => {
      await expect(inspector.load('track-debounced')).resolves.toMatchObject({
        document: latestChange,
        revision: 2,
      });
    });
    inspector.close();
    unmount();
  });

  it('saveNow flushes a pending autosave and reports its lifecycle', async () => {
    const indexedDb = new IDBFactory();
    vi.stubGlobal('indexedDB', indexedDb);
    const initialDocument = createEmptyTrackDocument(acceptedAt);
    const changedDocument = resizeDocument(initialDocument, 2_700);

    const { result, rerender, unmount } = renderHook(
      ({ document, revision }: { document: TrackDocumentV1; revision: number }) =>
        useEditorRecovery({
          trackId: 'track-save-now',
          document,
          revision,
          onRecover: vi.fn(),
          debounceMs: 10_000,
        }),
      {
        initialProps: {
          document: initialDocument,
          revision: 0,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    rerender({ document: changedDocument, revision: 1 });

    let saveResult = false;
    await act(async () => {
      saveResult = await result.current.saveNow();
    });

    expect(saveResult).toBe(true);
    expect(result.current.status).toBe('saved');
    const inspector = await openInspector(indexedDb);
    await expect(inspector.load('track-save-now')).resolves.toMatchObject({
      document: changedDocument,
      revision: 1,
    });
    inspector.close();
    unmount();
  });

  it('cancels pending autosave and closes its repository during cleanup', async () => {
    const indexedDb = new IDBFactory();
    vi.stubGlobal('indexedDB', indexedDb);
    const initialDocument = createEmptyTrackDocument(acceptedAt);
    const changedDocument = resizeDocument(initialDocument, 2_700);

    const { result, rerender, unmount } = renderHook(
      ({ document, revision }: { document: TrackDocumentV1; revision: number }) =>
        useEditorRecovery({
          trackId: 'track-cleanup',
          document,
          revision,
          onRecover: vi.fn(),
          debounceMs: 40,
        }),
      {
        initialProps: {
          document: initialDocument,
          revision: 0,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    rerender({ document: changedDocument, revision: 1 });
    unmount();
    await new Promise((resolve) => {
      setTimeout(resolve, 60);
    });

    const inspector = await openInspector(indexedDb);
    await expect(inspector.load('track-cleanup')).resolves.toBeNull();
    inspector.close();
  });

  it('fails safely when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const { result } = renderHook(() =>
      useEditorRecovery({
        trackId: 'track-unavailable',
        document: createEmptyTrackDocument(acceptedAt),
        revision: 0,
        onRecover: vi.fn(),
        debounceMs: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    await expect(result.current.saveNow()).resolves.toBe(false);
  });

  it('uses the latest track after a trackId change', async () => {
    const indexedDb = new IDBFactory();
    vi.stubGlobal('indexedDB', indexedDb);
    const initialDocument = createEmptyTrackDocument(acceptedAt);
    const changedDocument = resizeDocument(initialDocument, 2_700);

    const { result, rerender, unmount } = renderHook(
      ({
        trackId,
        document,
        revision,
      }: {
        trackId: string;
        document: TrackDocumentV1;
        revision: number;
      }) =>
        useEditorRecovery({
          trackId,
          document,
          revision,
          onRecover: vi.fn(),
          debounceMs: 10,
        }),
      {
        initialProps: {
          trackId: 'track-first',
          document: initialDocument,
          revision: 0,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    rerender({
      trackId: 'track-second',
      document: initialDocument,
      revision: 0,
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    rerender({
      trackId: 'track-second',
      document: changedDocument,
      revision: 1,
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });

    const inspector = await openInspector(indexedDb);
    await waitFor(async () => {
      await expect(inspector.load('track-second')).resolves.toMatchObject({
        document: changedDocument,
        revision: 1,
      });
    });
    await expect(inspector.load('track-first')).resolves.toBeNull();
    inspector.close();
    unmount();
  });
});
