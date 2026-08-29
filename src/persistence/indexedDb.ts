import { createDemoState } from '../fixtures/seedBirds';
import type { GameState } from '../domain/types';
import type { GameRepository } from './repository';

const DATABASE_NAME = 'lovebird-breeding-society';
const STORE_NAME = 'game-states';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('INDEXEDDB_REQUEST_FAILED'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('INDEXEDDB_TRANSACTION_FAILED'));
    transaction.onabort = () => reject(transaction.error ?? new Error('INDEXEDDB_TRANSACTION_ABORTED'));
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'saveId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('INDEXEDDB_OPEN_FAILED'));
  });
}

export class IndexedDbGameRepository implements GameRepository {
  constructor(private readonly saveId = 'save-lovebird-demo') {}

  async load(): Promise<GameState | null> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const value = await requestResult(
        transaction.objectStore(STORE_NAME).get(this.saveId) as IDBRequest<
          GameState | undefined
        >,
      );
      await transactionDone(transaction);
      return value ? structuredClone(value) : null;
    } finally {
      database.close();
    }
  }

  async save(expectedRevision: number, next: GameState): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const current = await requestResult(
        store.get(this.saveId) as IDBRequest<GameState | undefined>,
      );
      if (!current || current.revision !== expectedRevision) {
        transaction.abort();
        throw new Error('REVISION_CONFLICT');
      }
      if (next.revision !== expectedRevision + 1) {
        transaction.abort();
        throw new Error('REVISION_SEQUENCE_INVALID');
      }
      store.put(structuredClone(next));
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async resetDemo(): Promise<GameState> {
    const state = createDemoState();
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(structuredClone(state));
      await transactionDone(transaction);
      return structuredClone(state);
    } finally {
      database.close();
    }
  }
}
