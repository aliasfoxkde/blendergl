import { create } from "zustand";
import { UndoRedoManager, type Command } from "@/editor/utils/undoRedo";

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  manager: UndoRedoManager;

  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()((set, get) => {
  const manager = new UndoRedoManager(100, (canUndo, canRedo) => {
    set({
      canUndo,
      canRedo,
      undoDescription: manager.getUndoDescription(),
      redoDescription: manager.getRedoDescription(),
    });
  });

  return {
    canUndo: false,
    canRedo: false,
    undoDescription: null,
    redoDescription: null,
    manager,

    execute: (command) => get().manager.execute(command),
    undo: () => get().manager.undo(),
    redo: () => get().manager.redo(),
    clear: () => get().manager.clear(),
  };
});
