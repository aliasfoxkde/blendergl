import { useEffect } from "react";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useAiStore } from "@/editor/stores/aiStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useAnimationStore } from "@/editor/stores/animationStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { useSculptModeStore } from "@/editor/stores/sculptModeStore";
import { editControllerRef } from "@/editor/utils/editModeRef";
import { saveScene } from "@/editor/utils/storage";
import { duplicateEntities } from "@/editor/utils/duplicate";
import { armatureControllerRef } from "@/editor/utils/armatureController";
import type { TransformMode, ShadingMode, CameraPreset, EditorMode, AnimProperty, SculptBrushType } from "@/editor/types";

// Camera preset key mapping
const CAMERA_PRESETS: Record<string, CameraPreset> = {
  "1": "front",
  "3": "right",
  "7": "top",
};

function insertKeyframeForSelectedBones() {
  const poseStore = usePoseModeStore.getState();
  const animStore = useAnimationStore.getState();
  const armStore = useArmatureStore.getState();
  const entityId = poseStore.activeArmatureEntityId;
  if (!entityId) return;

  const arm = armStore.armatures[entityId];
  if (!arm) return;

  // Ensure an active clip exists
  let clipId = animStore.activeClipId;
  if (!clipId) {
    clipId = animStore.createClip("Action");
  }

  const frame = animStore.currentFrame;
  const properties: AnimProperty[] = [
    "position.x", "position.y", "position.z",
    "rotation.x", "rotation.y", "rotation.z",
  ];

  const controller = armatureControllerRef.current;
  const boneIds = poseStore.selectedBoneIds.size > 0
    ? Array.from(poseStore.selectedBoneIds)
    : (poseStore.activeBoneId ? [poseStore.activeBoneId] : []);

  for (const boneId of boneIds) {
    const bone = arm.bones[boneId];
    if (!bone) continue;

    for (const prop of properties) {
      const propName = prop.split(".")[0] as "position" | "rotation";
      const axis = prop.split(".")[1] as "x" | "y" | "z";

      // Get current pose from controller if available, otherwise use rest pose
      let value: number;
      if (controller) {
        const pose = controller.getBonePose(boneId);
        if (pose) {
          const posePart = propName === "position" ? pose.position : pose.rotation;
          value = posePart[axis];
        } else {
          const restPart = propName === "position" ? bone.restPosition : bone.restRotation;
          value = restPart[axis];
        }
      } else {
        const restPart = propName === "position" ? bone.restPosition : bone.restRotation;
        value = restPart[axis];
      }

      animStore.addKey(clipId, boneId, prop, frame, value);
    }
  }
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const selectionStore = useSelectionStore.getState();
      const sceneStore = useSceneStore.getState();
      const historyStore = useHistoryStore.getState();
      const editModeStore = useEditModeStore.getState();
      const settingsStore = useSettingsStore.getState();

      // Ctrl+Tab: cycle object → edit → pose → sculpt → object
      if (e.key === "Tab" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const modes: EditorMode[] = ["object", "edit", "pose", "sculpt"];
        const currentIdx = modes.indexOf(selectionStore.editorMode);
        const nextIdx = (currentIdx + 1) % modes.length;
        const nextMode = modes[nextIdx];
        if (nextMode === "edit") {
          if (selectionStore.activeEntityId) {
            selectionStore.setEditorMode("edit");
            editModeStore.enterEditMode(selectionStore.activeEntityId);
          }
        } else if (nextMode === "pose") {
          const entityId = selectionStore.activeEntityId;
          const arm = entityId ? useArmatureStore.getState().armatures[entityId] : null;
          if (arm) {
            selectionStore.setEditorMode("pose");
            usePoseModeStore.getState().enterPoseMode(entityId!);
            editModeStore.exitEditMode();
          }
        } else if (nextMode === "sculpt") {
          const entityId = selectionStore.activeEntityId;
          if (entityId) {
            selectionStore.setEditorMode("sculpt");
            editModeStore.exitEditMode();
            usePoseModeStore.getState().exitPoseMode();
            useSculptModeStore.getState().enterSculptMode(entityId);
          }
        } else {
          selectionStore.setEditorMode("object");
          editModeStore.exitEditMode();
          usePoseModeStore.getState().exitPoseMode();
          useSculptModeStore.getState().exitSculptMode();
        }
        return;
      }

      // Tab: toggle object/edit mode
      if (e.key === "Tab") {
        e.preventDefault();
        if (selectionStore.editorMode === "object") {
          if (selectionStore.activeEntityId) {
            selectionStore.setEditorMode("edit");
            editModeStore.enterEditMode(selectionStore.activeEntityId);
          }
        } else if (selectionStore.editorMode === "sculpt") {
          selectionStore.setEditorMode("object");
          useSculptModeStore.getState().exitSculptMode();
        } else {
          selectionStore.setEditorMode("object");
          editModeStore.exitEditMode();
        }
        return;
      }

      // Numpad camera presets
      if (e.code.startsWith("Numpad")) {
        const numpadKey = e.code.replace("Numpad", "");
        e.preventDefault();

        if (numpadKey === "5") {
          // Toggle ortho/perspective
          window.dispatchEvent(new CustomEvent("camera-toggle-ortho"));
          return;
        }

        const preset = CAMERA_PRESETS[numpadKey];
        if (preset) {
          const ctrlPreset: Record<string, CameraPreset> = { "1": "back", "3": "left", "7": "bottom" };
          const cameraPreset = e.ctrlKey ? ctrlPreset[numpadKey] : preset;
          if (cameraPreset) {
            window.dispatchEvent(
              new CustomEvent("camera-preset", { detail: cameraPreset })
            );
          }
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "f3":
          e.preventDefault();
          useAiStore.getState().togglePanel();
          return;
        case "n":
          if (!e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("toggle-node-editor"));
          }
          return;
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
        case "i":
          if (selectionStore.editorMode === "edit") {
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const data = controller.insetFaces(faceIds, 0.25);
              controller.applyPositions(data.newPositions);
              controller.applyIndices(data.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          } else if (selectionStore.editorMode === "pose" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            insertKeyframeForSelectedBones();
          }
          break;
        case "r":
          selectionStore.setTransformMode("scale" as TransformMode);
          break;
        case "z":
          // Z key: cycle shading mode (object mode)
          if (!e.ctrlKey && !e.metaKey && selectionStore.editorMode === "object") {
            const modes: ShadingMode[] = ["material", "wireframe", "solid"];
            const current = modes.indexOf(settingsStore.shadingMode);
            const next = modes[(current + 1) % modes.length];
            settingsStore.setShadingMode(next);
            return;
          }
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              historyStore.redo();
            } else {
              historyStore.undo();
            }
          }
          break;
        case "x":
        case "delete":
          if (selectionStore.editorMode === "edit") {
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const result = controller.deleteFaces(faceIds);
              controller.applyIndices(result.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          } else if (selectionStore.selectedIds.length > 0) {
            for (const id of selectionStore.selectedIds) {
              sceneStore.removeEntity(id);
            }
            selectionStore.deselectAll();
          }
          break;
        case "d":
          if (selectionStore.editorMode === "edit" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            // Subdivide in edit mode
            const controller = editControllerRef.current;
            if (controller) {
              const data = controller.subdivideAll();
              controller.applyPositions(data.newPositions);
              controller.applyIndices(data.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          } else if (e.shiftKey) {
            e.preventDefault();
            // Duplicate selected entities in object mode
            if (selectionStore.selectedIds.length > 0) {
              duplicateEntities(
                selectionStore.selectedIds,
                sceneStore,
                selectionStore,
                historyStore
              );
            }
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const allIds = Object.keys(sceneStore.entities);
            if (allIds.length > 0) {
              selectionStore.select(allIds[0], false);
              for (let i = 1; i < allIds.length; i++) {
                selectionStore.select(allIds[i], true);
              }
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
          } else if (selectionStore.editorMode === "sculpt") {
            if (e.shiftKey) {
              useSculptModeStore.getState().setBrushType("smooth" as SculptBrushType);
            } else {
              useSculptModeStore.getState().setBrushType("sculpt" as SculptBrushType);
            }
            return;
          }
          break;
        case "g":
          if (selectionStore.editorMode === "sculpt") {
            useSculptModeStore.getState().setBrushType("grab" as SculptBrushType);
            return;
          }
          break;
        case "c":
          if (selectionStore.editorMode === "sculpt") {
            useSculptModeStore.getState().setBrushType("crease" as SculptBrushType);
            return;
          }
          break;
        case "f":
          if (selectionStore.editorMode === "sculpt") {
            useSculptModeStore.getState().setBrushType("flatten" as SculptBrushType);
            return;
          }
          break;
        case "p":
          if (selectionStore.editorMode === "sculpt") {
            useSculptModeStore.getState().setBrushType("pinch" as SculptBrushType);
            return;
          }
          // Ctrl+P: parent selected to last selected (Blender convention)
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const ids = selectionStore.selectedIds;
            if (ids.length >= 2) {
              const parentId = ids[ids.length - 1];
              for (let i = 0; i < ids.length - 1; i++) {
                sceneStore.setParent(ids[i], parentId);
              }
            }
          }
          // Alt+P: clear parent
          if (e.altKey) {
            e.preventDefault();
            for (const id of selectionStore.selectedIds) {
              sceneStore.setParent(id, null);
            }
          }
          break;
        case "escape":
          if (selectionStore.editorMode === "edit") {
            selectionStore.setEditorMode("object");
            editModeStore.exitEditMode();
          }
          if (selectionStore.editorMode === "pose") {
            selectionStore.setEditorMode("object");
            usePoseModeStore.getState().exitPoseMode();
          }
          if (selectionStore.editorMode === "sculpt") {
            selectionStore.setEditorMode("object");
            useSculptModeStore.getState().exitSculptMode();
          }
          selectionStore.deselectAll();
          break;

        // Sculpt mode shortcuts
        case "[": {
          const sculptStore = useSculptModeStore.getState();
          if (selectionStore.editorMode === "sculpt") {
            e.preventDefault();
            sculptStore.setBrushRadius(sculptStore.brush.radius - 0.05);
            return;
          }
          break;
        }
        case "]": {
          const sculptStore = useSculptModeStore.getState();
          if (selectionStore.editorMode === "sculpt") {
            e.preventDefault();
            sculptStore.setBrushRadius(sculptStore.brush.radius + 0.05);
            return;
          }
          break;
        }

        // Left/Right arrows: step frame (pose mode)
        case "arrowleft":
          if (selectionStore.editorMode === "pose" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            useAnimationStore.getState().stepBackward();
            return;
          }
          break;
        case "arrowright":
          if (selectionStore.editorMode === "pose" && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            useAnimationStore.getState().stepForward();
            return;
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
