/**
 * Node Library — save/load node groups to IndexedDB.
 *
 * Allows users to save subgraphs as reusable assets.
 */

import type { GraphNode, GraphConnection, NodeGraphType } from "@/editor/types/nodeEditor";

const DB_NAME = "blendergl_node_library";
const DB_VERSION = 1;
const STORE_NAME = "node_groups";

export interface NodeGroupData {
  id?: number;
  name: string;
  description: string;
  graphType: NodeGraphType;
  nodes: Record<string, GraphNode>;
  connections: Record<string, GraphConnection>;
  createdAt: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveNodeGroup(
  name: string,
  description: string,
  graphType: NodeGraphType,
  nodes: Record<string, GraphNode>,
  connections: Record<string, GraphConnection>
): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const now = Date.now();
  const data: NodeGroupData = {
    name,
    description,
    graphType,
    nodes: JSON.parse(JSON.stringify(nodes)),
    connections: JSON.parse(JSON.stringify(connections)),
    createdAt: now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const req = store.add(data);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function loadNodeGroups(): Promise<NodeGroupData[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as NodeGroupData[]);
    req.onerror = () => reject(req.error);
  });
}

export async function loadNodeGroup(id: number): Promise<NodeGroupData | undefined> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as NodeGroupData | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNodeGroup(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateNodeGroup(
  id: number,
  name: string,
  description: string,
  nodes: Record<string, GraphNode>,
  connections: Record<string, GraphConnection>
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as NodeGroupData | undefined;
      if (!existing) { reject(new Error("Node group not found")); return; }
      const updated: NodeGroupData = {
        ...existing,
        name,
        description,
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
        updatedAt: Date.now(),
      };
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
