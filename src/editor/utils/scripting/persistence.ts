/**
 * Script persistence using IndexedDB.
 *
 * Stores saved scripts, startup scripts, and operator scripts.
 * All data is local to the browser — no server involved.
 */

export interface SavedScript {
  id: string;
  name: string;
  code: string;
  type: "startup" | "operator";
  createdAt: string;
  updatedAt: string;
  description?: string;
}

const DB_NAME = "blendergl-scripts";
const DB_VERSION = 1;
const STORE_NAME = "scripts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("name", "name", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<unknown> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      })
  );
}

/** List all saved scripts, optionally filtered by type. */
export async function listScripts(type?: "startup" | "operator"): Promise<SavedScript[]> {
  const all = (await withStore("readonly", (store) => store.getAll())) as SavedScript[];
  if (type) {
    return all.filter((s) => s.type === type);
  }
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Get a single script by ID. */
export async function getScript(id: string): Promise<SavedScript | null> {
  return (await withStore("readonly", (store) => store.get(id))) as SavedScript | null;
}

/** Save a script (insert or update). */
export async function saveScript(script: SavedScript): Promise<void> {
  await withStore("readwrite", (store) => store.put(script));
}

/** Delete a script by ID. */
export async function deleteScript(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/** Create a new script with auto-generated fields. */
export function createNewScript(
  name: string,
  code: string,
  type: "startup" | "operator" = "operator",
  description?: string
): SavedScript {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    code,
    type,
    createdAt: now,
    updatedAt: now,
    description,
  };
}

/** Export scripts as a JSON string (for backup/download). */
export async function exportScripts(scripts: SavedScript[]): Promise<string> {
  return JSON.stringify(scripts, null, 2);
}

/** Import scripts from a JSON string. Returns the imported scripts. */
export async function importScripts(json: string): Promise<SavedScript[]> {
  const parsed = JSON.parse(json) as SavedScript[];
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid script data: expected an array");
  }
  for (const script of parsed) {
    if (!script.id || !script.name || !script.code) {
      throw new Error(`Invalid script: missing required fields (${script.name ?? "unknown"})`);
    }
    // Assign new ID to avoid collisions
    script.id = crypto.randomUUID();
    script.updatedAt = new Date().toISOString();
    await saveScript(script);
  }
  return parsed;
}

/** Get all startup scripts (for auto-execution on scene load). */
export async function getStartupScripts(): Promise<SavedScript[]> {
  return listScripts("startup");
}
