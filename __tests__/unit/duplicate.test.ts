import { describe, it, expect, beforeEach } from "vitest";
import { duplicateEntities } from "@/editor/utils/duplicate";
import type { Entity } from "@/editor/types";
import type { Command } from "@/editor/utils/undoRedo";

function makeEntity(id: string, name: string): Entity {
  return {
    id,
    name,
    parentId: null,
    childrenIds: [],
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    visible: true,
    locked: false,
    components: { mesh: { type: "mesh", geometryType: "cube" } },
  };
}

describe("duplicateEntities", () => {
  let entities: Record<string, Entity>;
  let selectedIds: string[];
  let commands: Command[];

  const sceneStore = {
    get entities() { return entities; },
    addEntity(e: Entity) { entities[e.id] = e; },
    removeEntity(id: string) { delete entities[id]; },
  };

  const selectionStore = {
    select: (id: string, _additive: boolean) => { selectedIds = [id]; },
    deselectAll: () => { selectedIds = []; },
  };

  const historyStore = {
    execute(cmd: Command) { commands.push(cmd); },
  };

  beforeEach(() => {
    entities = { e1: makeEntity("e1", "Cube") };
    selectedIds = [];
    commands = [];
  });

  it("creates a duplicate entity with offset", () => {
    duplicateEntities(["e1"], sceneStore as never, selectionStore as never, historyStore as never);
    expect(commands.length).toBe(1);
    commands[0].execute();
    const ids = Object.keys(entities);
    expect(ids).toHaveLength(2);
    // Duplicated entity should have position offset by (1, 0, 1)
    const newEntity = Object.values(entities).find(e => e.id !== "e1")!;
    expect(newEntity.transform.position).toEqual({ x: 1, y: 0, z: 1 });
    expect(newEntity.name).toBe("Cube.001");
  });

  it("selects the new entity after duplication", () => {
    duplicateEntities(["e1"], sceneStore as never, selectionStore as never, historyStore as never);
    commands[0].execute();
    // Selection should be on the new entity, not the original
    expect(selectedIds.length).toBe(1);
    expect(selectedIds[0]).not.toBe("e1");
  });

  it("restores original selection on undo", () => {
    duplicateEntities(["e1"], sceneStore as never, selectionStore as never, historyStore as never);
    commands[0].execute();
    commands[0].undo();
    expect(selectedIds).toEqual(["e1"]);
  });

  it("removes duplicate entity on undo", () => {
    duplicateEntities(["e1"], sceneStore as never, selectionStore as never, historyStore as never);
    commands[0].execute();
    expect(Object.keys(entities).length).toBe(2);
    commands[0].undo();
    expect(Object.keys(entities)).toEqual(["e1"]);
  });

  it("skips non-existent entity IDs", () => {
    duplicateEntities(["e1", "missing"], sceneStore as never, selectionStore as never, historyStore as never);
    commands[0].execute();
    expect(Object.keys(entities).length).toBe(2); // original + 1 duplicate
  });

  it("duplicate has no parent and no children", () => {
    entities.e1.parentId = "parent";
    entities.e1.childrenIds = ["child"];
    duplicateEntities(["e1"], sceneStore as never, selectionStore as never, historyStore as never);
    commands[0].execute();
    const newEntity = Object.values(entities).find(e => e.id !== "e1")!;
    expect(newEntity.parentId).toBeNull();
    expect(newEntity.childrenIds).toEqual([]);
  });
});
