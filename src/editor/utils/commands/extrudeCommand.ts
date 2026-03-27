import type { Command } from "@/editor/utils/undoRedo";
import type { IndicesArray } from "@babylonjs/core";

interface ExtrudeData {
  oldPositions: Float32Array;
  oldIndices: IndicesArray;
  newPositions: Float32Array;
  newIndices: IndicesArray;
}

/**
 * Command to extrude selected faces from a mesh.
 * Stores original positions/indices and restores them on undo.
 */
export class ExtrudeFacesCommand implements Command {
  id: string;
  description: string;

  private applyFn: (positions: Float32Array, indices: IndicesArray) => void;
  private data: ExtrudeData;

  constructor(
    data: ExtrudeData,
    applyFn: (positions: Float32Array, indices: IndicesArray) => void
  ) {
    this.id = `extrude_faces_${Date.now()}`;
    this.description = `Extrude faces`;
    this.data = data;
    this.applyFn = applyFn;
  }

  execute(): void {
    this.applyFn(this.data.newPositions, this.data.newIndices);
  }

  undo(): void {
    this.applyFn(this.data.oldPositions, this.data.oldIndices);
  }
}
