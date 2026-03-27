import type { Command } from "@/editor/utils/undoRedo";

/**
 * Command to duplicate entities. Stores the added entity IDs
 * so they can be removed on undo.
 */
export class DuplicateCommand implements Command {
  id: string;
  description: string;

  private addFn: () => void;
  private removeFn: () => void;

  constructor(
    description: string,
    addFn: () => void,
    removeFn: () => void
  ) {
    this.id = `duplicate_${Date.now()}`;
    this.description = description;
    this.addFn = addFn;
    this.removeFn = removeFn;
  }

  execute(): void {
    this.addFn();
  }

  undo(): void {
    this.removeFn();
  }
}
