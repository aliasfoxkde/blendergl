import { describe, it, expect, beforeEach } from "vitest";
import {
  UndoRedoManager,
  TransformCommand,
  AddEntityCommand,
  DeleteEntityCommand,
} from "@/editor/utils/undoRedo";
import type { Transform } from "@/editor/types";

describe("UndoRedoManager", () => {
  let manager: UndoRedoManager;
  let transformLog: string[];

  beforeEach(() => {
    transformLog = [];
    manager = new UndoRedoManager();
  });

  it("executes commands and tracks history", () => {
    const command = new TransformCommand(
      "e1",
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      (_id, transform) => { transformLog.push(`set:${JSON.stringify(transform.position)}`); }
    );

    manager.execute(command);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    expect(transformLog).toHaveLength(1);
    expect(transformLog[0]).toContain('"x":1');
    expect(transformLog[0]).toContain('"y":2');
    expect(transformLog[0]).toContain('"z":3');
  });

  it("undoes and redoes commands", () => {
    const oldTransform: Transform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
    const newTransform: Transform = { position: { x: 5, y: 5, z: 5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };

    const command = new TransformCommand("e1", oldTransform, newTransform, (_id, _t) => {});

    manager.execute(command);
    manager.undo();
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);

    manager.redo();
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it("clears redo stack on new command", () => {
    const cmd1 = new TransformCommand("e1",
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      () => {}
    );
    const cmd2 = new TransformCommand("e1",
      { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      { position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      () => {}
    );

    manager.execute(cmd1);
    manager.execute(cmd2);
    manager.undo();
    expect(manager.canRedo()).toBe(true);

    // New command clears redo
    const cmd3 = new TransformCommand("e1",
      { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      { position: { x: 3, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      () => {}
    );
    manager.execute(cmd3);
    expect(manager.canRedo()).toBe(false);
  });

  it("respects max size", () => {
    const maxManager = new UndoRedoManager(3);
    for (let i = 0; i < 5; i++) {
      maxManager.execute(new TransformCommand(
        `e${i}`,
        { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        { position: { x: i, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
        () => {}
      ));
    }
    // Can only undo 3 (max size)
    maxManager.undo();
    maxManager.undo();
    maxManager.undo();
    expect(maxManager.canUndo()).toBe(false);
  });

  it("clears all history", () => {
    manager.execute(new TransformCommand("e1",
      { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      { position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      () => {}
    ));
    manager.undo();
    manager.clear();
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });
});

describe("TransformCommand", () => {
  it("applies new transform on execute, old on undo", () => {
    const transforms: Transform[] = [];
    const oldT: Transform = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };
    const newT: Transform = { position: { x: 10, y: 20, z: 30 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } };

    const cmd = new TransformCommand("e1", oldT, newT, (_id, t) => transforms.push({ ...t }));

    cmd.execute();
    expect(transforms).toHaveLength(1);
    expect(transforms[0].position).toEqual({ x: 10, y: 20, z: 30 });

    cmd.undo();
    expect(transforms).toHaveLength(2);
    expect(transforms[1].position).toEqual({ x: 0, y: 0, z: 0 });
  });
});
