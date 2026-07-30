import { z } from 'zod';

import { trackDocumentV1Schema, type TrackDocumentV1 } from '../../domain';

export const editorRecoveryDatabaseName = 'rescueSketchEditor';
export const editorRecoveryDatabaseVersion = 1;
export const editorRecoverySchemaVersion = 1;

const recoveryStoreName = 'trackRecovery';

export const editorRecoveryRecordSchema = z
  .object({
    schemaVersion: z.literal(editorRecoverySchemaVersion),
    trackId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/u),
    document: trackDocumentV1Schema,
    revision: z.number().int().nonnegative(),
    savedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type EditorRecoveryRecord = z.infer<typeof editorRecoveryRecordSchema>;

export interface SaveEditorRecoveryInput {
  trackId: string;
  document: TrackDocumentV1;
  revision: number;
  savedAt: string;
}

export interface EditorRecoveryOptions {
  databaseName?: string;
  indexedDb?: IDBFactory;
}

function requestResult<T>(request: IDBRequest<T>, transaction: IDBTransaction): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    };
  });
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    };
  });
}

export class EditorRecoveryRepository {
  readonly databaseName: string;
  readonly databaseVersion = editorRecoveryDatabaseVersion;

  private readonly indexedDb: IDBFactory;
  private database: IDBDatabase | null = null;

  constructor(options: EditorRecoveryOptions = {}) {
    const indexedDb = options.indexedDb ?? globalThis.indexedDB;

    if (indexedDb === undefined) {
      throw new Error('IndexedDB is not available in this environment.');
    }

    this.indexedDb = indexedDb;
    this.databaseName = options.databaseName ?? editorRecoveryDatabaseName;
  }

  get isOpen(): boolean {
    return this.database !== null;
  }

  async open(): Promise<void> {
    if (this.database !== null) {
      return;
    }

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDb.open(this.databaseName, this.databaseVersion);

      request.onupgradeneeded = (event) => {
        if (event.oldVersion < 1 && !request.result.objectStoreNames.contains(recoveryStoreName)) {
          request.result.createObjectStore(recoveryStoreName, { keyPath: 'trackId' });
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Could not open the editor recovery database.'));
      };
      request.onblocked = () => {
        reject(new Error('Editor recovery database upgrade is blocked by another connection.'));
      };
    });

    database.onversionchange = () => {
      database.close();

      if (this.database === database) {
        this.database = null;
      }
    };
    this.database = database;
  }

  close(): void {
    this.database?.close();
    this.database = null;
  }

  async save(input: SaveEditorRecoveryInput): Promise<EditorRecoveryRecord> {
    const database = this.requireDatabase();
    const record = editorRecoveryRecordSchema.parse({
      schemaVersion: editorRecoverySchemaVersion,
      ...input,
    });
    const transaction = database.transaction(recoveryStoreName, 'readwrite');
    transaction.objectStore(recoveryStoreName).put(record);
    await transactionCompletion(transaction);
    return record;
  }

  async load(trackId: string): Promise<EditorRecoveryRecord | null> {
    const database = this.requireDatabase();
    const transaction = database.transaction(recoveryStoreName, 'readonly');
    const result = await requestResult(
      transaction.objectStore(recoveryStoreName).get(trackId) as IDBRequest<unknown>,
      transaction,
    );

    return result === undefined ? null : editorRecoveryRecordSchema.parse(result);
  }

  async listTrackIds(): Promise<readonly string[]> {
    const database = this.requireDatabase();
    const transaction = database.transaction(recoveryStoreName, 'readonly');
    const keys = await requestResult(
      transaction.objectStore(recoveryStoreName).getAllKeys(),
      transaction,
    );

    return keys
      .filter((key): key is string => typeof key === 'string')
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  }

  async deleteTrack(trackId: string): Promise<void> {
    const database = this.requireDatabase();
    const transaction = database.transaction(recoveryStoreName, 'readwrite');
    transaction.objectStore(recoveryStoreName).delete(trackId);
    await transactionCompletion(transaction);
  }

  async clear(): Promise<void> {
    const database = this.requireDatabase();
    const transaction = database.transaction(recoveryStoreName, 'readwrite');
    transaction.objectStore(recoveryStoreName).clear();
    await transactionCompletion(transaction);
  }

  async deleteDatabase(): Promise<void> {
    this.close();

    await new Promise<void>((resolve, reject) => {
      const request = this.indexedDb.deleteDatabase(this.databaseName);

      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error ?? new Error('Could not delete the editor recovery database.'));
      };
      request.onblocked = () => {
        reject(new Error('Editor recovery database deletion is blocked by another connection.'));
      };
    });
  }

  private requireDatabase(): IDBDatabase {
    if (this.database === null) {
      throw new Error('Call open() before using editor recovery.');
    }

    return this.database;
  }
}
