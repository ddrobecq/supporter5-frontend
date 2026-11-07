/**
 * Minimal native IndexedDB key/value helper used to persist non-extractable CryptoKey objects
 * (CryptoKey is structured-clonable, so it can be stored as-is without exposing its raw bytes).
 */
const DB_NAME = 'supporter_secure';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

function openSecureDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked.'));
  });
}

async function runInStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openSecureDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error('IndexedDB transaction failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    });
  } finally {
    db.close();
  }
}

export async function getSecureValue<T>(key: string): Promise<T | undefined> {
  return (await runInStore('readonly', (store) => store.get(key))) as T | undefined;
}

export async function putSecureValue(key: string, value: unknown): Promise<void> {
  await runInStore('readwrite', (store) => store.put(value, key));
}

export async function deleteSecureValue(key: string): Promise<void> {
  await runInStore('readwrite', (store) => store.delete(key));
}
