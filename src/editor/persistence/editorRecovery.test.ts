import { IDBFactory } from 'fake-indexeddb';

import { createEmptyTrackDocument } from '../../domain';
import {
  EditorRecoveryRepository,
  editorRecoveryDatabaseVersion,
  editorRecoverySchemaVersion,
} from './editorRecovery';

const acceptedAt = '2026-07-30T18:00:00-04:00';
const savedAt = '2026-07-30T18:30:00-04:00';

describe('EditorRecoveryRepository', () => {
  it('requires explicit open and round-trips a versioned recovery record', async () => {
    const repository = new EditorRecoveryRepository({
      databaseName: 'recovery-round-trip',
      indexedDb: new IDBFactory(),
    });

    await expect(repository.load('track-a')).rejects.toThrow('Call open()');
    expect(repository.databaseVersion).toBe(editorRecoveryDatabaseVersion);

    await repository.open();
    expect(repository.isOpen).toBe(true);

    await repository.save({
      trackId: 'track-a',
      document: createEmptyTrackDocument(acceptedAt),
      revision: 7,
      savedAt,
    });

    await expect(repository.load('track-a')).resolves.toMatchObject({
      schemaVersion: editorRecoverySchemaVersion,
      trackId: 'track-a',
      revision: 7,
      savedAt,
    });

    repository.close();
    expect(repository.isOpen).toBe(false);
  });

  it('lists deterministically and supports per-track and complete deletion', async () => {
    const repository = new EditorRecoveryRepository({
      databaseName: 'recovery-delete',
      indexedDb: new IDBFactory(),
    });
    const document = createEmptyTrackDocument(acceptedAt);
    await repository.open();

    for (const trackId of ['track-z', 'track-a', 'track-m']) {
      await repository.save({ trackId, document, revision: 1, savedAt });
    }

    await expect(repository.listTrackIds()).resolves.toEqual(['track-a', 'track-m', 'track-z']);
    await repository.deleteTrack('track-m');
    await expect(repository.listTrackIds()).resolves.toEqual(['track-a', 'track-z']);
    await repository.clear();
    await expect(repository.listTrackIds()).resolves.toEqual([]);
  });

  it('deletes the database and can explicitly recreate an empty schema', async () => {
    const indexedDb = new IDBFactory();
    const repository = new EditorRecoveryRepository({
      databaseName: 'recovery-database-delete',
      indexedDb,
    });
    await repository.open();
    await repository.save({
      trackId: 'track-a',
      document: createEmptyTrackDocument(acceptedAt),
      revision: 1,
      savedAt,
    });

    await repository.deleteDatabase();
    expect(repository.isOpen).toBe(false);

    await repository.open();
    await expect(repository.load('track-a')).resolves.toBeNull();
  });

  it('rejects malformed records before they enter IndexedDB', async () => {
    const repository = new EditorRecoveryRepository({
      databaseName: 'recovery-validation',
      indexedDb: new IDBFactory(),
    });
    await repository.open();

    await expect(
      repository.save({
        trackId: 'invalid track id',
        document: createEmptyTrackDocument(acceptedAt),
        revision: 0,
        savedAt,
      }),
    ).rejects.toThrow();
    await expect(repository.listTrackIds()).resolves.toEqual([]);
  });
});
