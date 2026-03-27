import type { Command } from "@/editor/utils/undoRedo";

interface SculptData {
  oldPositions: Float32Array;
  newPositions: Float32Array;
}

/**
 * Command to undo/redo a sculpt stroke.
 * Stores vertex positions before and after the stroke.
 */
export class SculptCommand implements Command {
  id: string;
  description: string;

  private applyFn: (positions: Float32Array) => void;
  private data: SculptData;

  constructor(
    data: SculptData,
    applyFn: (positions: Float32Array) => void
  ) {
    this.id = `sculpt_stroke_${Date.now()}`;
    this.description = "Sculpt stroke";
    this.data = data;
    this.applyFn = applyFn;
  }

  execute(): void {
    this.applyFn(this.data.newPositions);
  }

  undo(): void {
    this.applyFn(this.data.oldPositions);
  }
}
