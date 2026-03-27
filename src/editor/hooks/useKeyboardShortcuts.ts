import { useEffect } from "react";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { saveScene } from "@/editor/utils/storage";
import type { TransformMode } from "@/editor/types";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const selectionStore = useSelectionStore.getState();
      const sceneStore = useSceneStore.getState();
      const historyStore = useHistoryStore.getState();

      switch (e.key.toLowerCase()) {
        case "w":
          selectionStore.setTransformMode("translate" as TransformMode);
          break;
        case "e":
          selectionStore.setTransformMode("rotate" as TransformMode);
          break;
        case "r":
          selectionStore.setTransformMode("scale" as TransformMode);
          break;
        case "x":
        case "delete":
          if (selectionStore.selectedIds.length > 0) {
            for (const id of selectionStore.selectedIds) {
              sceneStore.removeEntity(id);
            }
            selectionStore.deselectAll();
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Select all entities
            const allIds = Object.keys(sceneStore.entities);
            if (allIds.length > 0) {
              selectionStore.select(allIds[0], false);
              for (let i = 1; i < allIds.length; i++) {
                selectionStore.select(allIds[i], true);
              }
            }
          }
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              historyStore.redo();
            } else {
              historyStore.undo();
            }
          }
          break;
        case "y":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            historyStore.redo();
          }
          break;
        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveScene(sceneStore.scene);
          }
          break;
        case "escape":
          selectionStore.deselectAll();
          break;
        case "d":
          if (e.shiftKey) {
            e.preventDefault();
            // Duplicate - placeholder
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
