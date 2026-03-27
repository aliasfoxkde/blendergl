import type { Command } from "@/editor/utils/undoRedo";

/**
 * Command to import entities. Stores entity IDs and Babylon mesh references
 * so they can be removed on undo.
 */
export class ImportCommand implements Command {
  id: string;
  description: string;

  private removeFn: () => void;

  constructor(
    description: string,
    removeFn: () => void
  ) {
    this.id = `import_${Date.now()}`;
    this.description = description;
    this.removeFn = removeFn;
  }

  execute(): void {
    // Import already happened before command creation
  }

  undo(): void {
    this.removeFn();
  }
}
