import { openDB, type IDBPDatabase } from "idb";
import type { SceneData } from "@/editor/types";

const DB_NAME = "blendergl";
const DB_VERSION = 1;
const SCENES_STORE = "scenes";

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SCENES_STORE)) {
        const store = db.createObjectStore(SCENES_STORE, {
          keyPath: "id",
        });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("name", "name");
      }
    },
  });
}

export async function saveScene(scene: SceneData): Promise<void> {
  const db = await getDB();
  scene.updatedAt = new Date().toISOString();
  await db.put(SCENES_STORE, scene);
}

export async function loadScene(id: string): Promise<SceneData | undefined> {
  const db = await getDB();
  return db.get(SCENES_STORE, id);
}

export async function listScenes(): Promise<SceneData[]> {
  const db = await getDB();
  const all = await db.getAll(SCENES_STORE);
  return all.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function deleteScene(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(SCENES_STORE, id);
}

export async function loadLatestScene(): Promise<SceneData | undefined> {
  const db = await getDB();
  const all = await db.getAll(SCENES_STORE);
  if (all.length === 0) return undefined;
  return all.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];
}
