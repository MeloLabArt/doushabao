const DB_NAME = 'doushabao'
const DB_VERSION = 1
const STORE_NAME = 'workspace-images'

const memoryStore = new Map<string, string>()

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('无法打开图片存储'))
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    void openDb()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = run(store)

        transaction.oncomplete = () => {
          db.close()
          resolve(request.result)
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error ?? new Error('图片存储操作失败'))
        }
      })
      .catch(reject)
  })
}

export async function saveWorkspaceImage(
  workspaceId: string,
  dataUrl: string | undefined,
): Promise<void> {
  if (!isIndexedDbAvailable()) {
    if (dataUrl) {
      memoryStore.set(workspaceId, dataUrl)
    } else {
      memoryStore.delete(workspaceId)
    }
    return
  }

  if (dataUrl) {
    await runTransaction('readwrite', (store) => store.put(dataUrl, workspaceId))
    return
  }

  await runTransaction('readwrite', (store) => store.delete(workspaceId))
}

export async function loadWorkspaceImage(workspaceId: string): Promise<string | undefined> {
  if (!isIndexedDbAvailable()) {
    return memoryStore.get(workspaceId)
  }

  const result = await runTransaction('readonly', (store) => store.get(workspaceId))
  return typeof result === 'string' ? result : undefined
}

export async function deleteWorkspaceImage(workspaceId: string): Promise<void> {
  await saveWorkspaceImage(workspaceId, undefined)
}

export function clearWorkspaceImages(): void {
  memoryStore.clear()
}
