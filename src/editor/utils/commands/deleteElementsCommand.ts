import type { Command } from "@/editor/utils/undoRedo";
import type { IndicesArray } from "@babylonjs/core";

/**
 * Command to delete selected faces from a mesh.
 * Stores original indices and restores them on undo.
 */
export class DeleteFacesCommand implements Command {
  id: string;
  description: string;

  private applyFn: (indices: IndicesArray) => void;
  private oldIndices: IndicesArray;
  private newIndices: IndicesArray;

  constructor(
    oldIndices: IndicesArray,
    newIndices: IndicesArray,
    applyFn: (indices: IndicesArray) => void
  ) {
    this.id = `delete_faces_${Date.now()}`;
    this.description = `Delete ${oldIndices.length / 3 - newIndices.length / 3} faces`;
    this.oldIndices = oldIndices.slice() as IndicesArray;
    this.newIndices = newIndices.slice() as IndicesArray;
    this.applyFn = applyFn;
  }

  execute(): void {
    this.applyFn(this.newIndices);
  }

  undo(): void {
    this.applyFn(this.oldIndices);
  }
}
