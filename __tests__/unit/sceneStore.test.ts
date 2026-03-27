import { describe, it, expect, beforeEach } from "vitest";
import { useSceneStore } from "@/editor/stores/sceneStore";
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

describe("sceneStore", () => {
  beforeEach(() => {
    useSceneStore.getState().clearScene();
  });

  it("starts with an empty scene", () => {
    const state = useSceneStore.getState();
    expect(Object.keys(state.entities)).toHaveLength(0);
    expect(state.scene.rootEntityIds).toHaveLength(0);
  });

  it("adds an entity to the scene", () => {
    const entity = createTestEntity({ name: "Cube" });
    useSceneStore.getState().addEntity(entity);

    const state = useSceneStore.getState();
    expect(state.entities[entity.id]).toBeDefined();
    expect(state.entities[entity.id].name).toBe("Cube");
    expect(state.scene.rootEntityIds).toContain(entity.id);
  });

  it("removes an entity from the scene", () => {
    const entity = createTestEntity();
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().removeEntity(entity.id);

    const state = useSceneStore.getState();
    expect(state.entities[entity.id]).toBeUndefined();
    expect(state.scene.rootEntityIds).not.toContain(entity.id);
  });

  it("updates entity transform", () => {
    const entity = createTestEntity();
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityTransform(entity.id, {
      position: { x: 1, y: 2, z: 3 },
    });

    const state = useSceneStore.getState();
    expect(state.entities[entity.id].transform.position).toEqual({
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it("does not update transform of locked entity", () => {
    const entity = createTestEntity({ locked: true });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityTransform(entity.id, {
      position: { x: 99, y: 99, z: 99 },
    });

    const state = useSceneStore.getState();
    expect(state.entities[entity.id].transform.position).toEqual({
      x: 0,
      y: 0,
      z: 0,
    });
  });

  it("supports parent-child relationships", () => {
    const parent = createTestEntity({ name: "Parent" });
    const child = createTestEntity({ name: "Child", parentId: null });
    useSceneStore.getState().addEntity(parent);
    useSceneStore.getState().addEntity(child);
    useSceneStore.getState().setParent(child.id, parent.id);

    const state = useSceneStore.getState();
    expect(state.entities[parent.id].childrenIds).toContain(child.id);
    expect(state.entities[child.id].parentId).toBe(parent.id);
    expect(state.scene.rootEntityIds).not.toContain(child.id);
  });

  it("updates entity name", () => {
    const entity = createTestEntity({ name: "Old" });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityName(entity.id, "New");

    expect(useSceneStore.getState().entities[entity.id].name).toBe("New");
  });

  it("toggles entity visibility", () => {
    const entity = createTestEntity({ visible: true });
    useSceneStore.getState().addEntity(entity);
    useSceneStore.getState().updateEntityVisibility(entity.id, false);

    expect(useSceneStore.getState().entities[entity.id].visible).toBe(false);
  });

  it("clears all entities", () => {
    const e1 = createTestEntity({ name: "A" });
    const e2 = createTestEntity({ name: "B" });
    useSceneStore.getState().addEntity(e1);
    useSceneStore.getState().addEntity(e2);
    useSceneStore.getState().clearScene();

    const state = useSceneStore.getState();
    expect(Object.keys(state.entities)).toHaveLength(0);
  });
});
