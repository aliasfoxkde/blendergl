import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import {
  saveScene,
  loadScene,
  listScenes,
  deleteScene,
  loadLatestScene,
} from "@/editor/utils/storage";
import type { SceneData } from "@/editor/types";
import { createDefaultSceneSettings, createDefaultTransform } from "@/editor/types";

let sceneIdCounter = 0;
function createTestScene(overrides: Partial<SceneData> = {}): SceneData {
  sceneIdCounter++;
  return {
    id: `test_scene_${Date.now()}_${sceneIdCounter}_${Math.random().toString(36).slice(2)}`,
    name: "Test Scene",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entities: {},
    rootEntityIds: [],
    settings: createDefaultSceneSettings(),
    ...overrides,
  };
}

// ─── Persistence Tests ───────────────────────────────────────────

describe("Scene Persistence", () => {
  let createdIds: string[] = [];

  afterEach(async () => {
    // Cleanup: delete all scenes created during tests
    for (const id of createdIds) {
      try {
        await deleteScene(id);
      } catch {
        // Ignore cleanup errors
      }
    }
    createdIds = [];
  });

  it("saves and loads a scene", async () => {
    const scene = createTestScene({ name: "Save/Load Test" });
    createdIds.push(scene.id);

    await saveScene(scene);
    const loaded = await loadScene(scene.id);

    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(scene.id);
    expect(loaded!.name).toBe("Save/Load Test");
    expect(loaded!.entities).toEqual({});
    expect(loaded!.rootEntityIds).toEqual([]);
    expect(loaded!.settings.gridSize).toBe(20);
  });

  it("updates updatedAt on save", async () => {
    const scene = createTestScene();
    createdIds.push(scene.id);
    const originalUpdatedAt = scene.updatedAt;

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 10));

    await saveScene(scene);
    const loaded = await loadScene(scene.id);

    expect(loaded!.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("overwrites existing scene on save (upsert)", async () => {
    const scene = createTestScene({ name: "Original Name" });
    createdIds.push(scene.id);
    await saveScene(scene);

    scene.name = "Updated Name";
    await saveScene(scene);

    const loaded = await loadScene(scene.id);
    expect(loaded!.name).toBe("Updated Name");
  });

  it("lists scenes sorted by updatedAt", async () => {
    const scene1 = createTestScene({ name: "Scene A" });
    const scene2 = createTestScene({ name: "Scene B" });
    createdIds.push(scene1.id, scene2.id);

    // Save A first, then B — B should be latest (saveScene sets updatedAt)
    await saveScene(scene1);
    await new Promise((r) => setTimeout(r, 2));
    await saveScene(scene2);

    const scenes = await listScenes();
    expect(scenes.length).toBeGreaterThanOrEqual(2);

    // Most recently updated should be first
    expect(scenes[0].id).toBe(scene2.id);
  });

  it("returns undefined for non-existent scene", async () => {
    const loaded = await loadScene("non_existent_id_12345");
    expect(loaded).toBeUndefined();
  });

  it("deletes a scene", async () => {
    const scene = createTestScene();
    await saveScene(scene);

    await deleteScene(scene.id);
    const loaded = await loadScene(scene.id);
    expect(loaded).toBeUndefined();
    // Don't add to createdIds since we already deleted it
  });

  it("deleting non-existent scene does not throw", async () => {
    await expect(deleteScene("non_existent_id_12345")).resolves.not.toThrow();
  });

  it("loadLatestScene returns the most recently saved scene", async () => {
    const scene1 = createTestScene({ name: "Old Scene", updatedAt: "2025-01-01T00:00:00.000Z" });
    createdIds.push(scene1.id);
    await saveScene(scene1);

    const scene2 = createTestScene({ name: "New Scene", updatedAt: "2026-01-01T00:00:00.000Z" });
    createdIds.push(scene2.id);
    await saveScene(scene2);

    const latest = await loadLatestScene();
    expect(latest).toBeDefined();
    expect(latest!.id).toBe(scene2.id);
    expect(latest!.name).toBe("New Scene");
  });

  it("loadLatestScene returns undefined when DB is empty", async () => {
    // Save the current list, clear DB, test, then restore
    const existing = await listScenes();
    for (const s of existing) {
      await deleteScene(s.id);
    }

    const latest = await loadLatestScene();
    expect(latest).toBeUndefined();

    // Restore scenes
    for (const s of existing) {
      await saveScene(s);
    }
  });

  it("persists scene with entities and root IDs", async () => {
    const scene = createTestScene({
      rootEntityIds: ["e1", "e2"],
      entities: {
        e1: {
          id: "e1",
          name: "Cube",
          parentId: null,
          childrenIds: ["e2"],
          transform: createDefaultTransform(),
          visible: true,
          locked: false,
          components: {},
        },
        e2: {
          id: "e2",
          name: "Sphere",
          parentId: "e1",
          childrenIds: [],
          transform: createDefaultTransform(),
          visible: true,
          locked: false,
          components: {},
        },
      },
    });
    createdIds.push(scene.id);

    await saveScene(scene);
    const loaded = await loadScene(scene.id);

    expect(loaded!.rootEntityIds).toEqual(["e1", "e2"]);
    expect(loaded!.entities["e1"].name).toBe("Cube");
    expect(loaded!.entities["e2"].parentId).toBe("e1");
    expect(loaded!.entities["e1"].childrenIds).toEqual(["e2"]);
  });

  it("persists scene settings", async () => {
    const scene = createTestScene({
      settings: {
        gridSize: 30,
        gridSubdivisions: 10,
        snapEnabled: true,
        snapIncrement: 1.0,
        angleSnap: 45,
        backgroundColor: "#ff0000",
      },
    });
    createdIds.push(scene.id);

    await saveScene(scene);
    const loaded = await loadScene(scene.id);

    expect(loaded!.settings.gridSize).toBe(30);
    expect(loaded!.settings.snapEnabled).toBe(true);
    expect(loaded!.settings.backgroundColor).toBe("#ff0000");
  });
});
