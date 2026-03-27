import { useEffect } from "react";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { saveScene } from "@/editor/utils/storage";
import type { TransformMode } from "@/editor/types";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const selectionStore = useSelectionStore.getState();
      const sceneStore = useSceneStore.getState();

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
            // Select all - could be expanded
          }
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Undo - placeholder for undo system
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
