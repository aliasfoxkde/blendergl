import { describe, it, expect, beforeEach } from "vitest";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useRenderSettingsStore } from "@/editor/stores/renderSettingsStore";
import type { Entity } from "@/editor/types";
import { generateEntityId, createDefaultTransform } from "@/editor/types";

function createTestEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: generateEntityId(),
    name: "TestEntity",
    parentId: null,
    childrenIds: [],
    transform: createDefaultTransform(),
    visible: true,
    locked: false,
    components: {},
    ...overrides,
  };
}

// ─── Selection Store ──────────────────────────────────────────────

describe("selectionStore", () => {
  beforeEach(() => {
    // Reset via immer state
    useSelectionStore.setState({
      selectedIds: [],
      activeEntityId: null,
      editorMode: "object",
      selectionMode: "object",
      transformMode: "translate",
      transformSpace: "world",
      hoveredEntityId: null,
    });
  });

  it("starts empty", () => {
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toHaveLength(0);
    expect(s.activeEntityId).toBeNull();
  });

  it("selects a single entity (non-additive)", () => {
    useSelectionStore.getState().select("a");
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toEqual(["a"]);
    expect(s.activeEntityId).toBe("a");
  });

  it("replaces selection on non-additive select", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().select("b");
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toEqual(["b"]);
    expect(s.activeEntityId).toBe("b");
  });

  it("adds to selection on additive select", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().select("b", true);
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toEqual(["a", "b"]);
    expect(s.activeEntityId).toBe("b");
  });

  it("does not duplicate on additive select", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().select("a", true);
    expect(useSelectionStore.getState().selectedIds).toEqual(["a"]);
  });

  it("deselects an entity", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().select("b", true);
    useSelectionStore.getState().deselect("a");
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toEqual(["b"]);
  });

  it("updates activeEntityId when active is deselected", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().deselect("a");
    expect(useSelectionStore.getState().activeEntityId).toBeNull();
  });

  it("deselects all", () => {
    useSelectionStore.getState().select("a");
    useSelectionStore.getState().select("b", true);
    useSelectionStore.getState().deselectAll();
    const s = useSelectionStore.getState();
    expect(s.selectedIds).toHaveLength(0);
    expect(s.activeEntityId).toBeNull();
  });

  it("selects all", () => {
    useSelectionStore.getState().selectAll(["a", "b", "c"]);
    expect(useSelectionStore.getState().selectedIds).toEqual(["a", "b", "c"]);
  });

  it("sets active entity", () => {
    useSelectionStore.getState().setActiveEntity("x");
    expect(useSelectionStore.getState().activeEntityId).toBe("x");
    useSelectionStore.getState().setActiveEntity(null);
    expect(useSelectionStore.getState().activeEntityId).toBeNull();
  });

  it("sets editor mode", () => {
    useSelectionStore.getState().setEditorMode("edit");
    expect(useSelectionStore.getState().editorMode).toBe("edit");
    // Switching to object resets selectionMode
    useSelectionStore.getState().setEditorMode("object");
    expect(useSelectionStore.getState().selectionMode).toBe("object");
  });

  it("sets transform mode", () => {
    useSelectionStore.getState().setTransformMode("rotate");
    expect(useSelectionStore.getState().transformMode).toBe("rotate");
    useSelectionStore.getState().setTransformMode("scale");
    expect(useSelectionStore.getState().transformMode).toBe("scale");
  });

  it("sets transform space", () => {
    useSelectionStore.getState().setTransformSpace("local");
    expect(useSelectionStore.getState().transformSpace).toBe("local");
  });

  it("sets hovered entity", () => {
    useSelectionStore.getState().setHoveredEntity("h");
    expect(useSelectionStore.getState().hoveredEntityId).toBe("h");
    useSelectionStore.getState().setHoveredEntity(null);
    expect(useSelectionStore.getState().hoveredEntityId).toBeNull();
  });
});

// ─── Material Store ────────────────────────────────────────────────

describe("materialStore", () => {
  beforeEach(() => {
    useMaterialStore.setState({
      materials: {},
      activeMaterialId: null,
    });
  });

  it("starts empty", () => {
    const s = useMaterialStore.getState();
    expect(Object.keys(s.materials)).toHaveLength(0);
    expect(s.activeMaterialId).toBeNull();
  });

  it("creates a material with defaults", () => {
    useMaterialStore.getState().createMaterial("mat1");
    const mat = useMaterialStore.getState().getMaterial("mat1");
    expect(mat).toBeDefined();
    expect(mat!.albedo).toBe("#888888");
    expect(mat!.metallic).toBe(0);
    expect(mat!.roughness).toBe(0.5);
  });

  it("removes a material", () => {
    useMaterialStore.getState().createMaterial("mat1");
    useMaterialStore.getState().removeMaterial("mat1");
    expect(useMaterialStore.getState().getMaterial("mat1")).toBeUndefined();
  });

  it("clears activeMaterialId when active is removed", () => {
    useMaterialStore.getState().createMaterial("mat1");
    useMaterialStore.getState().setActiveMaterial("mat1");
    useMaterialStore.getState().removeMaterial("mat1");
    expect(useMaterialStore.getState().activeMaterialId).toBeNull();
  });

  it("updates material properties", () => {
    useMaterialStore.getState().createMaterial("mat1");
    useMaterialStore.getState().updateMaterial("mat1", { albedo: "#ff0000", metallic: 0.8 });
    const mat = useMaterialStore.getState().getMaterial("mat1");
    expect(mat!.albedo).toBe("#ff0000");
    expect(mat!.metallic).toBe(0.8);
    // Other properties unchanged
    expect(mat!.roughness).toBe(0.5);
  });

  it("sets active material", () => {
    useMaterialStore.getState().createMaterial("mat1");
    useMaterialStore.getState().createMaterial("mat2");
    useMaterialStore.getState().setActiveMaterial("mat2");
    expect(useMaterialStore.getState().activeMaterialId).toBe("mat2");
  });

  it("returns undefined for non-existent material", () => {
    expect(useMaterialStore.getState().getMaterial("nonexistent")).toBeUndefined();
  });

  it("supports multiple materials", () => {
    useMaterialStore.getState().createMaterial("mat1");
    useMaterialStore.getState().createMaterial("mat2");
    useMaterialStore.getState().createMaterial("mat3");
    expect(Object.keys(useMaterialStore.getState().materials)).toHaveLength(3);
  });
});

// ─── History Store ──────────────────────────────────────────────────

describe("historyStore", () => {
  beforeEach(() => {
    // The history store uses a class-based manager, so we just clear it
    useHistoryStore.getState().clear();
  });

  it("starts with no undo/redo", () => {
    const s = useHistoryStore.getState();
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
  });

  it("executes a command and enables undo", () => {
    let value = 0;
    const cmd = {
      id: "test",
      description: "increment",
      execute: () => { value++; },
      undo: () => { value--; },
    };
    useHistoryStore.getState().execute(cmd);
    expect(value).toBe(1);
    expect(useHistoryStore.getState().canUndo).toBe(true);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it("undoes a command", () => {
    let value = 0;
    const cmd = {
      id: "test",
      description: "increment",
      execute: () => { value++; },
      undo: () => { value--; },
    };
    useHistoryStore.getState().execute(cmd);
    useHistoryStore.getState().undo();
    expect(value).toBe(0);
    expect(useHistoryStore.getState().canUndo).toBe(false);
    expect(useHistoryStore.getState().canRedo).toBe(true);
  });

  it("redoes a command", () => {
    let value = 0;
    const cmd = {
      id: "test",
      description: "increment",
      execute: () => { value++; },
      undo: () => { value--; },
    };
    useHistoryStore.getState().execute(cmd);
    useHistoryStore.getState().undo();
    useHistoryStore.getState().redo();
    expect(value).toBe(1);
    expect(useHistoryStore.getState().canUndo).toBe(true);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });

  it("clears history", () => {
    let value = 0;
    const cmd = {
      id: "test",
      description: "increment",
      execute: () => { value++; },
      undo: () => { value--; },
    };
    useHistoryStore.getState().execute(cmd);
    useHistoryStore.getState().execute(cmd);
    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().canUndo).toBe(false);
    expect(useHistoryStore.getState().canRedo).toBe(false);
  });
});

// ─── Scene Store ────────────────────────────────────────────────────

describe("sceneStore", () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
  });

  it("starts empty", () => {
    const s = useSceneStore.getState();
    expect(Object.keys(s.entities)).toHaveLength(0);
    expect(s.scene.rootEntityIds).toHaveLength(0);
  });

  it("adds an entity", () => {
    const entity = createTestEntity({ id: "e1" });
    useSceneStore.getState().addEntity(entity);
    expect(useSceneStore.getState().entities["e1"]).toBeDefined();
    expect(useSceneStore.getState().scene.rootEntityIds).toContain("e1");
  });

  it("removes an entity", () => {
    const entity = createTestEntity({ id: "e1" });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().removeEntity("e1");
    expect(useSceneStore.getState().entities["e1"]).toBeUndefined();
    expect(useSceneStore.getState().scene.rootEntityIds).not.toContain("e1");
  });

  it("updates entity name", () => {
    const entity = createTestEntity({ id: "e1", name: "Cube" });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityName("e1", "Sphere");
    expect(useSceneStore.getState().entities["e1"].name).toBe("Sphere");
  });

  it("updates entity visibility", () => {
    const entity = createTestEntity({ id: "e1" });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityVisibility("e1", false);
    expect(useSceneStore.getState().entities["e1"].visible).toBe(false);
  });

  it("updates entity lock", () => {
    const entity = createTestEntity({ id: "e1" });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityLock("e1", true);
    expect(useSceneStore.getState().entities["e1"].locked).toBe(true);
  });

  it("sets parent-child relationship", () => {
    const parent = createTestEntity({ id: "p1" });
    const child = createTestEntity({ id: "c1" });
    useSceneStore.getState().addEntity(parent);
    useSceneStore.getState().addEntity(child);
    useSceneStore.getState().setParent("c1", "p1");
    expect(useSceneStore.getState().entities["c1"].parentId).toBe("p1");
    expect(useSceneStore.getState().entities["p1"].childrenIds).toContain("c1");
  });

  it("clears parent with null", () => {
    const parent = createTestEntity({ id: "p1" });
    const child = createTestEntity({ id: "c1" });
    useSceneStore.getState().addEntity(parent);
    useSceneStore.getState().addEntity(child);
    useSceneStore.getState().setParent("c1", "p1");
    useSceneStore.getState().setParent("c1", null);
    expect(useSceneStore.getState().entities["c1"].parentId).toBeNull();
    expect(useSceneStore.getState().entities["p1"].childrenIds).toHaveLength(0);
  });
});

// ─── Render Settings Store ──────────────────────────────────────────

describe("renderSettingsStore", () => {
  it("has sensible defaults", () => {
    const s = useRenderSettingsStore.getState().settings;
    expect(s.toneMapping).toBe("aces");
    expect(s.exposure).toBe(1.0);
    expect(s.shadowsEnabled).toBe(true);
    expect(s.antiAliasing).toBe("fxaa");
    expect(s.renderWidth).toBe(1920);
    expect(s.renderHeight).toBe(1080);
  });

  it("updates settings", () => {
    useRenderSettingsStore.getState().updateSettings({ exposure: 2.5 });
    expect(useRenderSettingsStore.getState().settings.exposure).toBe(2.5);
    // Other settings unchanged
    expect(useRenderSettingsStore.getState().settings.toneMapping).toBe("aces");
  });

  it("resets settings to defaults", () => {
    useRenderSettingsStore.getState().updateSettings({ exposure: 5.0 });
    useRenderSettingsStore.getState().resetSettings();
    expect(useRenderSettingsStore.getState().settings.exposure).toBe(1.0);
  });

  it("toggles panel", () => {
    expect(useRenderSettingsStore.getState().panelOpen).toBe(false);
    useRenderSettingsStore.getState().togglePanel();
    expect(useRenderSettingsStore.getState().panelOpen).toBe(true);
    useRenderSettingsStore.getState().togglePanel();
    expect(useRenderSettingsStore.getState().panelOpen).toBe(false);
  });
});
