import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { PrimitiveType, TransformMode, SculptBrushType } from "@/editor/types";
import { PRIMITIVE_TYPES } from "@/editor/utils/primitives";
import { useHistoryStore } from "@/editor/stores/historyStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { useSculptModeStore } from "@/editor/stores/sculptModeStore";
import { useTexturePaintStore } from "@/editor/stores/texturePaintStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useAiStore } from "@/editor/stores/aiStore";
import { usePhysicsStore } from "@/editor/stores/physicsStore";
import { useUvStore } from "@/editor/stores/uvStore";
import { useRenderSettingsStore } from "@/editor/stores/renderSettingsStore";
import { gameModeController } from "@/editor/utils/gameModeController";
import { duplicateEntities } from "@/editor/utils/duplicate";

interface ToolbarProps {
  onAddPrimitive: (type: PrimitiveType) => void;
  onDelete: () => void;
  onSave: () => void;
  transformMode: TransformMode;
  onTransformModeChange: (mode: TransformMode) => void;
  hasSelection: boolean;
}

export function Toolbar({
  onAddPrimitive,
  onDelete,
  onSave,
  transformMode,
  onTransformModeChange,
  hasSelection,
}: ToolbarProps) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [boolMenuOpen, setBoolMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  const editorMode = useSelectionStore((s) => s.editorMode);
  const setEditorMode = useSelectionStore((s) => s.setEditorMode);
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const elementMode = useEditModeStore((s) => s.elementMode);
  const setElementMode = useEditModeStore((s) => s.setElementMode);
  const enterEditMode = useEditModeStore((s) => s.enterEditMode);
  const exitEditMode = useEditModeStore((s) => s.exitEditMode);

  const shadingMode = useSettingsStore((s) => s.shadingMode);
  const setShadingMode = useSettingsStore((s) => s.setShadingMode);
  const snapEnabled = useSettingsStore((s) => s.snapEnabled);
  const setSnapEnabled = useSettingsStore((s) => s.setSnapEnabled);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const aiPanelOpen = useAiStore((s) => s.panelOpen);
  const toggleAiPanel = useAiStore((s) => s.togglePanel);
  const playMode = usePhysicsStore((s) => s.playMode);
  const playTime = usePhysicsStore((s) => s.playTime);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addMenuOpen]);

  return (
    <header className="h-10 bg-[#2a2a2a] border-b border-[#333] flex items-center px-2 gap-1 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-1.5 px-2 mr-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center text-[8px] font-bold">
          GL
        </div>
        <span className="text-xs font-medium text-gray-300 hidden sm:inline">
          BlenderGL
        </span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5 bg-[#444]" />

      {/* Mode indicator */}
      <button
        title={`Switch Mode (Tab) — Current: ${editorMode === "edit" ? "Edit" : editorMode === "pose" ? "Pose" : editorMode === "sculpt" ? "Sculpt" : editorMode === "texture_paint" ? "TexPaint" : "Object"} Mode`}
        className={`px-2 h-7 flex items-center gap-1 rounded text-[10px] font-medium transition ${
          editorMode === "edit"
            ? "bg-blue-600/30 text-blue-300 border border-blue-500/50"
            : editorMode === "pose"
              ? "bg-green-600/30 text-green-300 border border-green-500/50"
              : editorMode === "sculpt"
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : editorMode === "texture_paint"
                  ? "bg-orange-600/30 text-orange-300 border border-orange-500/50"
                  : "text-gray-400 hover:text-white"
        }`}
        onClick={() => {
          if (editorMode === "object") {
            if (activeEntityId) {
              setEditorMode("edit");
              enterEditMode(activeEntityId);
            }
          } else if (editorMode === "edit") {
            const arm = activeEntityId ? useArmatureStore.getState().armatures[activeEntityId] : null;
            if (arm) {
              setEditorMode("pose");
              exitEditMode();
              usePoseModeStore.getState().enterPoseMode(activeEntityId!);
            } else {
              setEditorMode("object");
              exitEditMode();
            }
          } else if (editorMode === "pose") {
            if (activeEntityId) {
              setEditorMode("sculpt");
              usePoseModeStore.getState().exitPoseMode();
              useSculptModeStore.getState().enterSculptMode(activeEntityId);
            } else {
              setEditorMode("object");
              usePoseModeStore.getState().exitPoseMode();
            }
          } else if (editorMode === "sculpt") {
            if (activeEntityId) {
              setEditorMode("texture_paint");
              useSculptModeStore.getState().exitSculptMode();
              useTexturePaintStore.getState().enterPaintMode(activeEntityId);
            } else {
              setEditorMode("object");
              useSculptModeStore.getState().exitSculptMode();
            }
          } else {
            setEditorMode("object");
            useTexturePaintStore.getState().exitPaintMode();
          }
        }}
      >
        {editorMode === "edit" ? "Edit" : editorMode === "pose" ? "Pose" : editorMode === "sculpt" ? "Sculpt" : editorMode === "texture_paint" ? "TexPaint" : "Object"}
      </button>

      {/* Element mode buttons (edit mode only) */}
      {editorMode === "edit" && (
        <>
          <button
            title="Vertex Mode (1)"
            className={`px-1.5 h-7 text-[10px] font-medium rounded transition ${
              elementMode === "vertex"
                ? "bg-[#4a4a5a] text-white"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setElementMode("vertex")}
          >
            Vert
          </button>
          <button
            title="Edge Mode (2)"
            className={`px-1.5 h-7 text-[10px] font-medium rounded transition ${
              elementMode === "edge"
                ? "bg-[#4a4a5a] text-white"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setElementMode("edge")}
          >
            Edge
          </button>
          <button
            title="Face Mode (3)"
            className={`px-1.5 h-7 text-[10px] font-medium rounded transition ${
              elementMode === "face"
                ? "bg-[#4a4a5a] text-white"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setElementMode("face")}
          >
            Face
          </button>
          <div className="w-px h-5 bg-[#444]" />
        </>
      )}

      {/* Brush selector (sculpt mode only) */}
      {editorMode === "sculpt" && (
        <SculptBrushButtons />
      )}

      {/* Transform mode buttons (object mode only) */}
      {editorMode === "object" && (
        <>
          <ToolButton
            label="Move (W)"
            active={transformMode === "translate"}
            onClick={() => onTransformModeChange("translate")}
            shortcut="W"
          >
            <MoveIcon />
          </ToolButton>
          <ToolButton
            label="Rotate (E)"
            active={transformMode === "rotate"}
            onClick={() => onTransformModeChange("rotate")}
            shortcut="E"
          >
            <RotateIcon />
          </ToolButton>
          <ToolButton
            label="Scale (R)"
            active={transformMode === "scale"}
            onClick={() => onTransformModeChange("scale")}
            shortcut="R"
          >
            <ScaleIcon />
          </ToolButton>
        </>
      )}

      <div className="w-px h-5 bg-[#444]" />

      {/* Add object */}
      <div className="relative" ref={menuRef}>
        <ToolButton
          label="Add Object"
          active={addMenuOpen}
          onClick={() => setAddMenuOpen(!addMenuOpen)}
        >
          <PlusIcon />
        </ToolButton>
        {addMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-[#333] border border-[#444] rounded-lg shadow-xl py-1 min-w-[140px] z-50">
            {PRIMITIVE_TYPES.map((type) => (
              <button
                key={type}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#444] hover:text-white transition capitalize"
                onClick={() => {
                  onAddPrimitive(type);
                  setAddMenuOpen(false);
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-[#444]" />

      {/* Import */}
      <ToolButton
        label="Import glTF/GLB"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".gltf,.glb";
          input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            window.dispatchEvent(new CustomEvent("import-gltf", { detail: file }));
          };
          input.click();
        }}
      >
        <ImportIcon />
      </ToolButton>

      {/* Export STL */}
      <ToolButton
        label="Export STL"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("export-stl", { detail: { selectedIds } }));
        }}
      >
        <ExportIcon />
      </ToolButton>

      {/* Export G-code */}
      <ToolButton
        label="Export G-code"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("export-gcode", { detail: { selectedIds } }));
        }}
      >
        <PrinterIcon />
      </ToolButton>

      {/* Delete */}
      <ToolButton
        label="Delete (X)"
        onClick={onDelete}
        disabled={!hasSelection}
      >
        <TrashIcon />
      </ToolButton>

      {/* Duplicate */}
      <ToolButton
        label="Duplicate (Shift+D)"
        onClick={() => {
          if (selectedIds.length > 0) {
            duplicateEntities(
              selectedIds,
              useSceneStore.getState(),
              useSelectionStore.getState(),
              useHistoryStore.getState()
            );
          }
        }}
        disabled={!hasSelection}
      >
        <CopyIcon />
      </ToolButton>

      {/* Boolean operations dropdown */}
      {selectedIds.length === 2 && (
        <div className="relative" ref={menuRef}>
          <ToolButton
            label="Boolean"
            active={boolMenuOpen}
            onClick={() => setBoolMenuOpen(!boolMenuOpen)}
          >
            <BooleanIcon />
          </ToolButton>
          {boolMenuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#333] border border-[#444] rounded-lg shadow-xl py-1 min-w-[130px] z-50">
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#444] hover:text-white transition"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("boolean-op", { detail: { op: "union" } }));
                  setBoolMenuOpen(false);
                }}
              >
                Union
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#444] hover:text-white transition"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("boolean-op", { detail: { op: "difference" } }));
                  setBoolMenuOpen(false);
                }}
              >
                Difference
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#444] hover:text-white transition"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("boolean-op", { detail: { op: "intersection" } }));
                  setBoolMenuOpen(false);
                }}
              >
                Intersection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Snap toggle */}
      <ToolButton
        label={`Snap ${snapEnabled ? "ON" : "OFF"}`}
        active={snapEnabled}
        onClick={() => setSnapEnabled(!snapEnabled)}
      >
        <MagnetIcon />
      </ToolButton>

      {/* Shading mode */}
      <ToolButton
        label={`Shading: ${shadingMode} (Z)`}
        onClick={() => {
          const modes = ["material", "wireframe", "solid", "xray"] as const;
          const idx = modes.indexOf(shadingMode as typeof modes[number]);
          setShadingMode(modes[(idx + 1) % modes.length]);
        }}
      >
        <ShadingIcon mode={shadingMode} />
      </ToolButton>

      {/* Game Mode Controls */}
      <div className="w-px h-5 bg-[#444]" />
      {playMode === "stopped" ? (
        <ToolButton
          label="Play (F5)"
          active={false}
          onClick={() => {
            gameModeController.start();
            usePhysicsStore.getState().startPlay();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </ToolButton>
      ) : (
        <>
          {playMode === "playing" ? (
            <ToolButton
              label="Pause (F5)"
              active={false}
              onClick={() => {
                gameModeController.pause();
                usePhysicsStore.getState().pausePlay();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </ToolButton>
          ) : (
            <ToolButton
              label="Resume (F5)"
              active={false}
              onClick={() => {
                gameModeController.resume();
                usePhysicsStore.getState().resumePlay();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </ToolButton>
          )}
          <ToolButton
            label="Stop (Esc)"
            active={false}
            onClick={() => {
              gameModeController.stop();
              usePhysicsStore.getState().stopPlay();
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </ToolButton>
          <span className="text-[9px] text-green-400 tabular-nums font-mono">
            {playTime.toFixed(1)}s
          </span>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* AI Assistant */}
      <ToolButton
        label="AI Assistant (F3)"
        active={aiPanelOpen}
        onClick={toggleAiPanel}
      >
        <SparkleIcon />
      </ToolButton>

      {/* Node Editor */}
      <ToolButton
        label="Node Editor (N)"
        onClick={() => window.dispatchEvent(new CustomEvent("toggle-node-editor"))}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="3" cy="3" r="2" />
          <circle cx="11" cy="3" r="2" />
          <circle cx="3" cy="11" r="2" />
          <circle cx="11" cy="11" r="2" />
          <line x1="5" y1="3" x2="9" y2="3" />
          <line x1="3" y1="5" x2="3" y2="9" />
          <line x1="11" y1="5" x2="11" y2="9" />
          <line x1="5" y1="11" x2="9" y2="11" />
        </svg>
      </ToolButton>

      {/* UV Editor */}
      <ToolButton
        label="UV Editor (U)"
        active={useUvStore((s) => s.panelOpen)}
        onClick={() => useUvStore.getState().togglePanel()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="15" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="15" r="1.5" fill="currentColor" />
          <circle cx="15" cy="15" r="1.5" fill="currentColor" />
        </svg>
      </ToolButton>

      {/* Render Settings */}
      <ToolButton
        label="Render Settings"
        active={useRenderSettingsStore((s) => s.panelOpen)}
        onClick={() => useRenderSettingsStore.getState().togglePanel()}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="6" strokeDasharray="2 2" />
        </svg>
      </ToolButton>

      {/* Undo/Redo */}
      <ToolButton
        label="Undo (Ctrl+Z)"
        onClick={undo}
        disabled={!canUndo}
      >
        <UndoIcon />
      </ToolButton>
      <ToolButton
        label="Redo (Ctrl+Shift+Z)"
        onClick={redo}
        disabled={!canRedo}
      >
        <RedoIcon />
      </ToolButton>

      <div className="w-px h-5 bg-[#444]" />

      {/* Save */}
      <ToolButton label="Save (Ctrl+S)" onClick={onSave}>
        <SaveIcon />
      </ToolButton>
    </header>
  );
}

function ToolButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick,
  shortcut,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      title={shortcut ? `${label} [${shortcut}]` : label}
      className={`w-7 h-7 flex items-center justify-center rounded transition ${
        active
          ? "bg-[#4a4a5a] text-white"
          : disabled
            ? "text-gray-600 cursor-not-allowed"
            : "text-gray-400 hover:bg-[#3a3a3a] hover:text-white"
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// SVG Icons
function MoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
    </svg>
  );
}

function ScaleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function MagnetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 15V9a6 6 0 0112 0v6" />
      <path d="M6 11h12" />
      <line x1="6" y1="15" x2="6" y2="19" />
      <line x1="18" y1="15" x2="18" y2="19" />
    </svg>
  );
}

function ShadingIcon({ mode }: { mode: string }) {
  if (mode === "wireframe") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    );
  }
  if (mode === "solid") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    );
  }
  if (mode === "xray") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a7 7 0 017 7" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function BooleanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="12" r="6" />
      <circle cx="15" cy="12" r="6" />
    </svg>
  );
}

const BRUSH_TYPES: { type: SculptBrushType; label: string; shortcut: string }[] = [
  { type: "sculpt", label: "Sculpt", shortcut: "S" },
  { type: "smooth", label: "Smooth", shortcut: "Shift+S" },
  { type: "grab", label: "Grab", shortcut: "G" },
  { type: "inflate", label: "Inflate", shortcut: "I" },
  { type: "pinch", label: "Pinch", shortcut: "P" },
  { type: "flatten", label: "Flatten", shortcut: "F" },
  { type: "crease", label: "Crease", shortcut: "C" },
  { type: "clay_strips", label: "Clay Strips", shortcut: "Shift+C" },
  { type: "mask", label: "Mask", shortcut: "M" },
];

function SculptBrushButtons() {
  const brushType = useSculptModeStore((s) => s.brush.type);
  const setBrushType = useSculptModeStore((s) => s.setBrushType);
  const radius = useSculptModeStore((s) => s.brush.radius);
  const strength = useSculptModeStore((s) => s.brush.strength);

  return (
    <>
      {BRUSH_TYPES.map(({ type, label, shortcut }) => (
        <button
          key={type}
          title={`${label} (${shortcut})`}
          className={`px-1.5 h-7 text-[10px] font-medium rounded transition ${
            brushType === type
              ? "bg-purple-500/40 text-purple-200"
              : "text-gray-400 hover:text-white"
          }`}
          onClick={() => setBrushType(type)}
        >
          {label.charAt(0)}
        </button>
      ))}
      <div className="w-px h-5 bg-[#444]" />
      <span className="text-[9px] text-gray-500 tabular-nums">
        R:{radius.toFixed(2)} S:{strength.toFixed(2)}
      </span>
    </>
  );
}
