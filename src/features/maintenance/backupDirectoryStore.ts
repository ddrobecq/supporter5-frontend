const DB_NAME = 'supporter-backup';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const DIRECTORY_KEY = 'directory';

function openStoreDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStoreDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = run(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Operation IndexedDB impossible.'));
    });
  } finally {
    db.close();
  }
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) => store.get(DIRECTORY_KEY));
  return handle ?? null;
}

export async function setStoredDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, DIRECTORY_KEY));
}

export async function clearStoredDirectoryHandle(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(DIRECTORY_KEY));
}
