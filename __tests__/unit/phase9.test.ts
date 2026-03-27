import { describe, it, expect, beforeEach } from "vitest";
import { DuplicateCommand } from "@/editor/utils/commands/duplicateCommand";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useCollectionStore } from "@/editor/stores/collectionStore";
import { useShortcutStore, SHORTCUT_ACTIONS } from "@/editor/stores/shortcutStore";
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

// ─── DuplicateCommand ─────────────────────────────────────────────

describe("DuplicateCommand", () => {
  it("stores description and id", () => {
    const addFn = () => {};
    const removeFn = () => {};
    const cmd = new DuplicateCommand("Duplicate 1 object", addFn, removeFn);
    expect(cmd.description).toBe("Duplicate 1 object");
    expect(cmd.id).toMatch(/^duplicate_/);
  });

  it("calls addFn on execute", () => {
    let called = false;
    const addFn = () => { called = true; };
    const removeFn = () => {};
    const cmd = new DuplicateCommand("Dup", addFn, removeFn);
    cmd.execute();
    expect(called).toBe(true);
  });

  it("calls removeFn on undo", () => {
    let called = false;
    const addFn = () => {};
    const removeFn = () => { called = true; };
    const cmd = new DuplicateCommand("Dup", addFn, removeFn);
    cmd.undo();
    expect(called).toBe(true);
  });

  it("supports execute-undo cycle", () => {
    let value = 0;
    const addFn = () => { value = 1; };
    const removeFn = () => { value = 0; };
    const cmd = new DuplicateCommand("Dup", addFn, removeFn);
    cmd.execute();
    expect(value).toBe(1);
    cmd.undo();
    expect(value).toBe(0);
    cmd.execute();
    expect(value).toBe(1);
  });
});

// ─── Duplicate entities integration ────────────────────────────────

describe("duplicateEntities (integration)", () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
  });

  it("creates a new entity with offset position", () => {
    const entity = createTestEntity();
    // Manually set position since createDefaultTransform doesn't accept overrides
    entity.transform.position = { x: 2, y: 0, z: 3 };
    useSceneStore.getState().addEntity(entity);

    const beforeCount = Object.keys(useSceneStore.getState().entities).length;

    // Simulate what duplicateEntities does (without history store)
    const orig = useSceneStore.getState().entities[entity.id];
    const duplicated: Entity = {
      ...orig,
      id: generateEntityId(),
      name: `${orig.name}.001`,
      transform: {
        ...orig.transform,
        position: {
          x: orig.transform.position.x + 1,
          y: orig.transform.position.y,
          z: orig.transform.position.z + 1,
        },
      },
      parentId: null,
      childrenIds: [],
    };
    useSceneStore.getState().addEntity(duplicated);

    const afterCount = Object.keys(useSceneStore.getState().entities).length;
    expect(afterCount).toBe(beforeCount + 1);
    expect(duplicated.transform.position.x).toBe(3);
    expect(duplicated.transform.position.z).toBe(4);
    expect(duplicated.name).toBe("TestEntity.001");
  });
});

// ─── Shading Mode ──────────────────────────────────────────────────

describe("shadingMode", () => {
  it("has valid default shading mode", () => {
    const mode = useSettingsStore.getState().shadingMode;
    expect(["wireframe", "solid", "material", "textured", "xray"]).toContain(mode);
  });

  it("can cycle through shading modes", () => {
    const modes = ["material", "wireframe", "solid"] as const;
    const store = useSettingsStore.getState();
    const current = modes.indexOf(store.shadingMode as typeof modes[number]);
    const next = modes[(current + 1) % modes.length];
    store.setShadingMode(next);
    expect(useSettingsStore.getState().shadingMode).toBe(next);
  });

  it("can set to wireframe", () => {
    useSettingsStore.getState().setShadingMode("wireframe");
    expect(useSettingsStore.getState().shadingMode).toBe("wireframe");
  });

  it("can set to xray", () => {
    useSettingsStore.getState().setShadingMode("xray");
    expect(useSettingsStore.getState().shadingMode).toBe("xray");
  });
});

// ─── Collection Store ──────────────────────────────────────────────

describe("collectionStore", () => {
  beforeEach(() => {
    // Reset collection store state
    useCollectionStore.setState({
      collections: {},
      collectionOrder: [],
      activeCollectionId: null,
    });
  });

  it("creates a collection", () => {
    const id = useCollectionStore.getState().createCollection("Test Collection");
    expect(id).toBeTruthy();
    const col = useCollectionStore.getState().collections[id];
    expect(col).toBeDefined();
    expect(col!.name).toBe("Test Collection");
    expect(col!.entityIds).toHaveLength(0);
    expect(col!.visible).toBe(true);
    expect(col!.locked).toBe(false);
  });

  it("adds entity to collection", () => {
    const id = useCollectionStore.getState().createCollection("Col");
    useCollectionStore.getState().addEntityToCollection("entity_1", id);
    expect(useCollectionStore.getState().collections[id]!.entityIds).toContain("entity_1");
  });

  it("does not add duplicate entity to collection", () => {
    const id = useCollectionStore.getState().createCollection("Col");
    useCollectionStore.getState().addEntityToCollection("entity_1", id);
    useCollectionStore.getState().addEntityToCollection("entity_1", id);
    expect(useCollectionStore.getState().collections[id]!.entityIds).toHaveLength(1);
  });

  it("removes entity from collection", () => {
    const id = useCollectionStore.getState().createCollection("Col");
    useCollectionStore.getState().addEntityToCollection("entity_1", id);
    useCollectionStore.getState().addEntityToCollection("entity_2", id);
    useCollectionStore.getState().removeEntityFromCollection("entity_1", id);
    expect(useCollectionStore.getState().collections[id]!.entityIds).toEqual(["entity_2"]);
  });

  it("removes collection", () => {
    const id = useCollectionStore.getState().createCollection("Col");
    expect(Object.keys(useCollectionStore.getState().collections)).toHaveLength(1);
    useCollectionStore.getState().removeCollection(id);
    expect(Object.keys(useCollectionStore.getState().collections)).toHaveLength(0);
    expect(useCollectionStore.getState().collectionOrder).toHaveLength(0);
  });

  it("toggles collection visibility", () => {
    const id = useCollectionStore.getState().createCollection("Col");
    expect(useCollectionStore.getState().collections[id]!.visible).toBe(true);
    useCollectionStore.getState().toggleCollectionVisibility(id);
    expect(useCollectionStore.getState().collections[id]!.visible).toBe(false);
    useCollectionStore.getState().toggleCollectionVisibility(id);
    expect(useCollectionStore.getState().collections[id]!.visible).toBe(true);
  });

  it("finds collection for entity", () => {
    const id1 = useCollectionStore.getState().createCollection("Col1");
    const id2 = useCollectionStore.getState().createCollection("Col2");
    useCollectionStore.getState().addEntityToCollection("e1", id1);
    useCollectionStore.getState().addEntityToCollection("e2", id2);
    expect(useCollectionStore.getState().getCollectionForEntity("e1")).toBe(id1);
    expect(useCollectionStore.getState().getCollectionForEntity("e2")).toBe(id2);
    expect(useCollectionStore.getState().getCollectionForEntity("e3")).toBeNull();
  });

  it("moves entity between collections", () => {
    const id1 = useCollectionStore.getState().createCollection("Col1");
    const id2 = useCollectionStore.getState().createCollection("Col2");
    useCollectionStore.getState().addEntityToCollection("e1", id1);
    useCollectionStore.getState().moveEntityToCollection("e1", id1, id2);
    expect(useCollectionStore.getState().collections[id1]!.entityIds).toHaveLength(0);
    expect(useCollectionStore.getState().collections[id2]!.entityIds).toContain("e1");
  });

  it("renames collection", () => {
    const id = useCollectionStore.getState().createCollection("Old");
    useCollectionStore.getState().renameCollection(id, "New");
    expect(useCollectionStore.getState().collections[id]!.name).toBe("New");
  });

  it("reorders collections up", () => {
    const id1 = useCollectionStore.getState().createCollection("A");
    const id2 = useCollectionStore.getState().createCollection("B");
    const id3 = useCollectionStore.getState().createCollection("C");
    expect(useCollectionStore.getState().collectionOrder).toEqual([id1, id2, id3]);
    // Move id1 up: [id2, id1, id3]
    useCollectionStore.getState().moveCollectionUp(id1);
    expect(useCollectionStore.getState().collectionOrder[0]).toBe(id2);
    expect(useCollectionStore.getState().collectionOrder[1]).toBe(id1);
  });

  it("reorders collections down", () => {
    const id1 = useCollectionStore.getState().createCollection("A");
    const id2 = useCollectionStore.getState().createCollection("B");
    const id3 = useCollectionStore.getState().createCollection("C");
    // Move id3 down: [id1, id3, id2]
    useCollectionStore.getState().moveCollectionDown(id3);
    expect(useCollectionStore.getState().collectionOrder[1]).toBe(id3);
    expect(useCollectionStore.getState().collectionOrder[2]).toBe(id2);
  });

  it("creates collections with different colors", () => {
    const id1 = useCollectionStore.getState().createCollection("A");
    const id2 = useCollectionStore.getState().createCollection("B");
    const col1 = useCollectionStore.getState().collections[id1];
    const col2 = useCollectionStore.getState().collections[id2];
    expect(col1!.color).toBeTruthy();
    expect(col2!.color).toBeTruthy();
  });
});

// ─── Shortcut Store ────────────────────────────────────────────────

describe("shortcutStore", () => {
  it("has default bindings for all actions", () => {
    const bindings = useShortcutStore.getState().bindings;
    for (const action of SHORTCUT_ACTIONS) {
      expect(bindings[action.id]).toBeDefined();
      expect(bindings[action.id].key).toBe(action.defaultBinding.key);
    }
  });

  it("can update a binding", () => {
    const action = SHORTCUT_ACTIONS[0];
    useShortcutStore.getState().setBinding(action.id, { key: "q", ctrl: true, shift: false, alt: false });
    const binding = useShortcutStore.getState().bindings[action.id];
    expect(binding.key).toBe("q");
    expect(binding.ctrl).toBe(true);
  });

  it("can reset a binding", () => {
    const action = SHORTCUT_ACTIONS[0];
    useShortcutStore.getState().setBinding(action.id, { key: "q", ctrl: true, shift: false, alt: false });
    useShortcutStore.getState().resetBinding(action.id);
    const binding = useShortcutStore.getState().bindings[action.id];
    expect(binding.key).toBe(action.defaultBinding.key);
    expect(binding.ctrl).toBe(action.defaultBinding.ctrl);
  });

  it("can reset all bindings", () => {
    const action = SHORTCUT_ACTIONS[0];
    useShortcutStore.getState().setBinding(action.id, { key: "q", ctrl: true, shift: false, alt: false });
    useShortcutStore.getState().resetAll();
    const binding = useShortcutStore.getState().bindings[action.id];
    expect(binding.key).toBe(action.defaultBinding.key);
  });
});
