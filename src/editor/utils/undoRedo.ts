import type { Transform } from "@/editor/types";

// Command interface for undo/redo
export interface Command {
  id: string;
  description: string;
  execute(): void;
  undo(): void;
}

// Transform command - records entity transform changes
export class TransformCommand implements Command {
  id: string;
  description: string;
  private entityId: string;
  private oldTransform: Transform;
  private newTransform: Transform;
  private applyTransform: (id: string, transform: Transform) => void;

  constructor(
    entityId: string,
    oldTransform: Transform,
    newTransform: Transform,
    applyFn: (id: string, transform: Transform) => void
  ) {
    this.id = `transform_${Date.now()}`;
    this.description = `Transform ${entityId}`;
    this.entityId = entityId;
    this.oldTransform = { ...oldTransform };
    this.newTransform = { ...newTransform };
    this.applyTransform = applyFn;
  }

  execute(): void {
    this.applyTransform(this.entityId, this.newTransform);
  }

  undo(): void {
    this.applyTransform(this.entityId, this.oldTransform);
  }
}

// Add entity command
export class AddEntityCommand implements Command {
  id: string;
  description: string;
  private addFn: () => void;
  private removeFn: () => void;

  constructor(
    description: string,
    addFn: () => void,
    removeFn: () => void
  ) {
    this.id = `add_${Date.now()}`;
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

// Delete entity command
export class DeleteEntityCommand implements Command {
  id: string;
  description: string;
  private addFn: () => void;
  private removeFn: () => void;

  constructor(
    description: string,
    addFn: () => void,
    removeFn: () => void
  ) {
    this.id = `delete_${Date.now()}`;
    this.description = description;
    this.addFn = addFn;
    this.removeFn = removeFn;
  }

  execute(): void {
    this.removeFn();
  }

  undo(): void {
    this.addFn();
  }
}

// Undo/Redo manager
export class UndoRedoManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSize: number;
  private onChange?: (canUndo: boolean, canRedo: boolean) => void;

  constructor(maxSize = 100, onChange?: (canUndo: boolean, canRedo: boolean) => void) {
    this.maxSize = maxSize;
    this.onChange = onChange;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.onChange?.(this.canUndo(), this.canRedo());
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;

    command.undo();
    this.redoStack.push(command);
    this.onChange?.(this.canUndo(), this.canRedo());
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;

    command.execute();
    this.undoStack.push(command);
    this.onChange?.(this.canUndo(), this.canRedo());
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange?.(false, false);
  }

  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command?.description ?? null;
  }

  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command?.description ?? null;
  }
}
