import { describe, it, expect, beforeEach } from "vitest";
import {
  UndoRedoManager,
  TransformCommand,
  AddEntityCommand,
  DeleteEntityCommand,
} from "@/editor/utils/undoRedo";
import type { Transform } from "@/editor/types";

const defaultTransform: Transform = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

describe("UndoRedoManager advanced", () => {
  describe("onChange callback", () => {
    it("fires on execute with canUndo=true, canRedo=false", () => {
      const states: [boolean, boolean][] = [];
      const manager = new UndoRedoManager(100, (canUndo, canRedo) => states.push([canUndo, canRedo]));
      manager.execute(new TransformCommand("e1", defaultTransform, defaultTransform, () => {}));
      expect(states).toEqual([[true, false]]);
    });

    it("fires on undo with canUndo=false, canRedo=true", () => {
      const states: [boolean, boolean][] = [];
      const manager = new UndoRedoManager(100, (canUndo, canRedo) => states.push([canUndo, canRedo]));
      manager.execute(new TransformCommand("e1", defaultTransform, defaultTransform, () => {}));
      manager.undo();
      expect(states).toEqual([[true, false], [false, true]]);
    });

    it("fires on redo with canUndo=true, canRedo=false", () => {
      const states: [boolean, boolean][] = [];
      const manager = new UndoRedoManager(100, (canUndo, canRedo) => states.push([canUndo, canRedo]));
      manager.execute(new TransformCommand("e1", defaultTransform, defaultTransform, () => {}));
      manager.undo();
      manager.redo();
      expect(states).toEqual([[true, false], [false, true], [true, false]]);
    });

    it("fires on clear with canUndo=false, canRedo=false", () => {
      const states: [boolean, boolean][] = [];
      const manager = new UndoRedoManager(100, (canUndo, canRedo) => states.push([canUndo, canRedo]));
      manager.execute(new TransformCommand("e1", defaultTransform, defaultTransform, () => {}));
      manager.clear();
      expect(states[1]).toEqual([false, false]);
    });
  });

  describe("getUndoDescription / getRedoDescription", () => {
    it("returns description of last undo command", () => {
      const manager = new UndoRedoManager();
      const cmd = new AddEntityCommand("Add cube", () => {}, () => {});
      manager.execute(cmd);
      expect(manager.getUndoDescription()).toBe("Add cube");
    });

    it("returns null when undo stack is empty", () => {
      const manager = new UndoRedoManager();
      expect(manager.getUndoDescription()).toBeNull();
    });

    it("returns description of last redo command", () => {
      const manager = new UndoRedoManager();
      manager.execute(new AddEntityCommand("Add cube", () => {}, () => {}));
      manager.undo();
      expect(manager.getRedoDescription()).toBe("Add cube");
    });

    it("returns null when redo stack is empty", () => {
      const manager = new UndoRedoManager();
      manager.execute(new AddEntityCommand("Add cube", () => {}, () => {}));
      expect(manager.getRedoDescription()).toBeNull();
    });
  });

  describe("undo does nothing when stack empty", () => {
    it("does not throw", () => {
      const manager = new UndoRedoManager();
      expect(() => manager.undo()).not.toThrow();
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe("redo does nothing when stack empty", () => {
    it("does not throw", () => {
      const manager = new UndoRedoManager();
      expect(() => manager.redo()).not.toThrow();
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe("AddEntityCommand / DeleteEntityCommand", () => {
    it("AddEntityCommand execute adds, undo removes", () => {
      let added = false;
      const cmd = new AddEntityCommand("Add sphere", () => { added = true; }, () => { added = false; });
      expect(added).toBe(false);
      cmd.execute();
      expect(added).toBe(true);
      cmd.undo();
      expect(added).toBe(false);
    });

    it("DeleteEntityCommand execute removes, undo adds", () => {
      let exists = true;
      const cmd = new DeleteEntityCommand("Del cube", () => { exists = true; }, () => { exists = false; });
      cmd.execute();
      expect(exists).toBe(false);
      cmd.undo();
      expect(exists).toBe(true);
    });

    it("command has required id and description", () => {
      const addCmd = new AddEntityCommand("test", () => {}, () => {});
      expect(addCmd.id).toBeTruthy();
      expect(addCmd.description).toBe("test");

      const delCmd = new DeleteEntityCommand("test", () => {}, () => {});
      expect(delCmd.id).toBeTruthy();
      expect(delCmd.description).toBe("test");
    });
  });
});
