import { generateEntityId } from "@/editor/types";
import { DuplicateCommand } from "@/editor/utils/commands/duplicateCommand";
import type { Command } from "@/editor/utils/undoRedo";
import type { Entity } from "@/editor/types";

/**
 * Duplicate the given entity IDs, offsetting each by (1, 0, 1).
 * Pushes an undo/redo command onto the history stack.
 */
export function duplicateEntities(
  ids: string[],
  sceneStore: { entities: Record<string, Entity>; addEntity: (e: Entity) => void; removeEntity: (id: string) => void },
  selectionStore: { select: (id: string, additive: boolean) => void; deselectAll: () => void },
  historyStore: { execute: (cmd: Command) => void }
): void {
  const originalEntities = ids.map((id) => sceneStore.entities[id]).filter(Boolean);

  // Build new entities (deep clone with offset)
  const newEntities: Entity[] = originalEntities.map((entity) => ({
    ...entity,
    id: generateEntityId(),
    name: `${entity.name}.001`,
    transform: {
      ...entity.transform,
      position: {
        x: entity.transform.position.x + 1,
        y: entity.transform.position.y,
        z: entity.transform.position.z + 1,
      },
    },
    parentId: null,
    childrenIds: [] as string[],
  }));

  // Build command
  const addFn = () => {
    for (const entity of newEntities) {
      sceneStore.addEntity(entity);
    }
    selectionStore.deselectAll();
    for (const entity of newEntities) {
      selectionStore.select(entity.id, false);
    }
  };

  const removeFn = () => {
    for (const entity of newEntities) {
      sceneStore.removeEntity(entity.id);
    }
    selectionStore.deselectAll();
    for (const id of ids) {
      selectionStore.select(id, false);
    }
  };

  const cmd = new DuplicateCommand(
    `Duplicate ${newEntities.length} object${newEntities.length !== 1 ? "s" : ""}`,
    addFn,
    removeFn
  );

  historyStore.execute(cmd);
}
