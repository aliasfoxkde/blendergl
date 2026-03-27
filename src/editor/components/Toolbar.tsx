import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import type { PrimitiveType, TransformMode } from "@/editor/types";
import { PRIMITIVE_TYPES } from "@/editor/utils/primitives";
import { useHistoryStore } from "@/editor/stores/historyStore";

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
  const menuRef = useRef<HTMLDivElement>(null);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

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

      {/* Transform mode buttons */}
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

      {/* Delete */}
      <ToolButton
        label="Delete (X)"
        onClick={onDelete}
        disabled={!hasSelection}
      >
        <TrashIcon />
      </ToolButton>

      {/* Spacer */}
      <div className="flex-1" />

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
