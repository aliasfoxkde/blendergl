import { useEffect } from "react";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { editControllerRef } from "@/editor/utils/editModeRef";
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
      const editModeStore = useEditModeStore.getState();

      // Tab: toggle object/edit mode
      if (e.key === "Tab") {
        e.preventDefault();
        if (selectionStore.editorMode === "object") {
          if (selectionStore.activeEntityId) {
            selectionStore.setEditorMode("edit");
            editModeStore.enterEditMode(selectionStore.activeEntityId);
          }
        } else {
          selectionStore.setEditorMode("object");
          editModeStore.exitEditMode();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        // Element mode shortcuts (edit mode only)
        case "1":
          if (selectionStore.editorMode === "edit") {
            editModeStore.setElementMode("vertex");
            return;
          }
          break;
        case "2":
          if (selectionStore.editorMode === "edit") {
            editModeStore.setElementMode("edge");
            return;
          }
          break;
        case "3":
          if (selectionStore.editorMode === "edit") {
            editModeStore.setElementMode("face");
            return;
          }
          break;
        case "w":
          selectionStore.setTransformMode("translate" as TransformMode);
          break;
        case "e":
          if (selectionStore.editorMode === "edit") {
            // Edit mode: extrude selected faces
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const data = controller.extrudeFaces(faceIds, 0.3);
              controller.applyPositions(data.newPositions);
              controller.applyIndices(data.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          } else {
            selectionStore.setTransformMode("rotate" as TransformMode);
          }
          break;
        case "r":
          selectionStore.setTransformMode("scale" as TransformMode);
          break;
        case "x":
        case "delete":
          if (selectionStore.editorMode === "edit") {
            // Edit mode: delete selected faces
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const result = controller.deleteFaces(faceIds);
              controller.applyIndices(result.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          } else if (selectionStore.selectedIds.length > 0) {
            // Object mode: delete entities
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
          if (selectionStore.editorMode === "edit") {
            selectionStore.setEditorMode("object");
            editModeStore.exitEditMode();
          }
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
