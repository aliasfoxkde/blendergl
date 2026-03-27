import { useState, useEffect, useRef, useCallback } from "react";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { duplicateEntities } from "@/editor/utils/duplicate";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { editControllerRef } from "@/editor/utils/editModeRef";
import type { PrimitiveType } from "@/editor/types";
import { createPrimitiveEntity } from "@/editor/utils/primitives";

interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
}

export function ContextMenu() {
  const [state, setState] = useState<ContextMenuState>({ x: 0, y: 0, visible: false });
  const menuRef = useRef<HTMLDivElement>(null);

  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only show on viewport (main element)
      const target = e.target as HTMLElement;
      if (!target.closest("main")) return;

      e.preventDefault();
      setState({ x: e.clientX, y: e.clientY, visible: true });
    };

    const handleClick = () => hide();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hide]);

  if (!state.visible) return null;

  const selectionStore = useSelectionStore.getState();
  const sceneStore = useSceneStore.getState();
  const historyStore = useHistoryStore.getState();
  const editModeStore = useEditModeStore.getState();
  const editorMode = selectionStore.editorMode;
  const hasSelection = selectionStore.selectedIds.length > 0;

  const items: MenuItem[] = editorMode === "edit"
    ? [
        {
          label: "Select All",
          onClick: () => {
            // Select all faces (simplified — select first 10 faces)
            const controller = editControllerRef.current;
            if (controller) {
              const faceCount = controller.getFaceCount();
              editModeStore.deselectAll();
              for (let i = 0; i < Math.min(faceCount, 50); i++) {
                editModeStore.selectFace(i, true);
              }
            }
          },
        },
        {
          label: "Deselect All",
          shortcut: "Esc",
          onClick: () => editModeStore.deselectAll(),
        },
        { label: "separator", onClick: () => {} },
        {
          label: "Extrude",
          shortcut: "E",
          disabled: editModeStore.selectedFaces.size === 0,
          onClick: () => {
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const data = controller.extrudeFaces(faceIds, 0.3);
              controller.applyPositions(data.newPositions);
              controller.applyIndices(data.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          },
        },
        {
          label: "Bevel",
          shortcut: "Ctrl+B",
          disabled: editModeStore.selectedEdges.size === 0,
          onClick: () => {
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedEdges.size > 0) {
              const edgeKeys = Array.from(editModeStore.selectedEdges);
              const data = controller.bevelEdges(edgeKeys, 0.1);
              controller.applyPositions(data.newPositions);
              controller.applyIndices(data.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          },
        },
        {
          label: "Delete",
          shortcut: "X",
          disabled: editModeStore.selectedFaces.size === 0,
          onClick: () => {
            const controller = editControllerRef.current;
            if (controller && editModeStore.selectedFaces.size > 0) {
              const faceIds = Array.from(editModeStore.selectedFaces);
              const result = controller.deleteFaces(faceIds);
              controller.applyIndices(result.newIndices);
              controller.rebuildNormals();
              editModeStore.deselectAll();
            }
          },
        },
      ]
    : [
        {
          label: "Add Cube",
          onClick: () => {
            const entity = createPrimitiveEntity("cube" as PrimitiveType);
            sceneStore.addEntity(entity);
            selectionStore.deselectAll();
            selectionStore.select(entity.id, false);
          },
        },
        {
          label: "Add Sphere",
          onClick: () => {
            const entity = createPrimitiveEntity("sphere" as PrimitiveType);
            sceneStore.addEntity(entity);
            selectionStore.deselectAll();
            selectionStore.select(entity.id, false);
          },
        },
        { label: "separator", onClick: () => {} },
        {
          label: "Duplicate",
          shortcut: "Shift+D",
          disabled: !hasSelection,
          onClick: () => {
            if (selectionStore.selectedIds.length > 0) {
              duplicateEntities(selectionStore.selectedIds, sceneStore, selectionStore, historyStore);
            }
          },
        },
        {
          label: "Delete",
          shortcut: "X",
          disabled: !hasSelection,
          onClick: () => {
            for (const id of selectionStore.selectedIds) {
              sceneStore.removeEntity(id);
            }
            selectionStore.deselectAll();
          },
        },
        { label: "separator", onClick: () => {} },
        {
          label: "Show All",
          onClick: () => {
            for (const entity of Object.values(sceneStore.entities)) {
              if (!entity.visible) {
                sceneStore.updateEntityVisibility(entity.id, true);
              }
            }
          },
        },
      ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#333] border border-[#444] rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: state.x, top: state.y }}
    >
      {items.map((item, i) =>
        item.label === "separator" ? (
          <div key={i} className="h-px bg-[#444] my-1" />
        ) : (
          <button
            key={i}
            className={`w-full text-left px-3 py-1 text-xs flex items-center justify-between transition ${
              item.disabled
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-300 hover:bg-[#444] hover:text-white"
            }`}
            onClick={() => {
              if (!item.disabled) item.onClick();
              hide();
            }}
            disabled={item.disabled}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-gray-500 ml-4">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
}
