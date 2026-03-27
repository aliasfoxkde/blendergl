/**
 * Configurable keyboard shortcut store.
 * Stores action → key combo mappings with persistence.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface ShortcutBinding {
  key: string; // e.g. "w", "e", "r"
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export interface ShortcutAction {
  id: string;
  label: string;
  category: string;
  defaultBinding: ShortcutBinding;
}

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  // Transform
  { id: "transform.translate", label: "Move", category: "Transform", defaultBinding: { key: "w", ctrl: false, shift: false, alt: false } },
  { id: "transform.rotate", label: "Rotate", category: "Transform", defaultBinding: { key: "e", ctrl: false, shift: false, alt: false } },
  { id: "transform.scale", label: "Scale", category: "Transform", defaultBinding: { key: "r", ctrl: false, shift: false, alt: false } },

  // Edit modes
  { id: "mode.vertex", label: "Vertex Select", category: "Edit Mode", defaultBinding: { key: "1", ctrl: false, shift: false, alt: false } },
  { id: "mode.edge", label: "Edge Select", category: "Edit Mode", defaultBinding: { key: "2", ctrl: false, shift: false, alt: false } },
  { id: "mode.face", label: "Face Select", category: "Edit Mode", defaultBinding: { key: "3", ctrl: false, shift: false, alt: false } },

  // General
  { id: "general.delete", label: "Delete", category: "General", defaultBinding: { key: "x", ctrl: false, shift: false, alt: false } },
  { id: "general.duplicate", label: "Duplicate", category: "General", defaultBinding: { key: "d", ctrl: false, shift: true, alt: false } },
  { id: "general.select_all", label: "Select All", category: "General", defaultBinding: { key: "a", ctrl: true, shift: false, alt: false } },
  { id: "general.undo", label: "Undo", category: "General", defaultBinding: { key: "z", ctrl: true, shift: false, alt: false } },
  { id: "general.redo", label: "Redo", category: "General", defaultBinding: { key: "z", ctrl: true, shift: true, alt: false } },
  { id: "general.redo_y", label: "Redo (Y)", category: "General", defaultBinding: { key: "y", ctrl: true, shift: false, alt: false } },
  { id: "general.save", label: "Save", category: "General", defaultBinding: { key: "s", ctrl: true, shift: false, alt: false } },
  { id: "general.parent", label: "Parent", category: "General", defaultBinding: { key: "p", ctrl: true, shift: false, alt: false } },
  { id: "general.clear_parent", label: "Clear Parent", category: "General", defaultBinding: { key: "p", ctrl: false, shift: false, alt: true } },

  // Viewport
  { id: "viewport.shading", label: "Cycle Shading", category: "Viewport", defaultBinding: { key: "z", ctrl: false, shift: false, alt: false } },
  { id: "viewport.tab", label: "Toggle Edit Mode", category: "Viewport", defaultBinding: { key: "Tab", ctrl: false, shift: false, alt: false } },
  { id: "viewport.play", label: "Play/Stop", category: "Viewport", defaultBinding: { key: "F5", ctrl: false, shift: false, alt: false } },

  // Panels
  { id: "panel.ai", label: "AI Panel", category: "Panels", defaultBinding: { key: "F3", ctrl: false, shift: false, alt: false } },
  { id: "panel.node_editor", label: "Node Editor", category: "Panels", defaultBinding: { key: "n", ctrl: false, shift: false, alt: false } },
  { id: "panel.uv", label: "UV Editor", category: "Panels", defaultBinding: { key: "u", ctrl: false, shift: false, alt: false } },

  // Edit mode
  { id: "edit.extrude", label: "Extrude", category: "Edit Mode", defaultBinding: { key: "e", ctrl: false, shift: false, alt: false } },
  { id: "edit.inset", label: "Inset Face", category: "Edit Mode", defaultBinding: { key: "i", ctrl: false, shift: false, alt: false } },
  { id: "edit.subdivide", label: "Subdivide", category: "Edit Mode", defaultBinding: { key: "d", ctrl: true, shift: false, alt: false } },

  // Sculpt
  { id: "sculpt.sculpt", label: "Sculpt Brush", category: "Sculpt", defaultBinding: { key: "s", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.smooth", label: "Smooth Brush", category: "Sculpt", defaultBinding: { key: "s", ctrl: false, shift: true, alt: false } },
  { id: "sculpt.grab", label: "Grab Brush", category: "Sculpt", defaultBinding: { key: "g", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.crease", label: "Crease Brush", category: "Sculpt", defaultBinding: { key: "c", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.flatten", label: "Flatten Brush", category: "Sculpt", defaultBinding: { key: "f", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.pinch", label: "Pinch Brush", category: "Sculpt", defaultBinding: { key: "p", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.radius_dec", label: "Decrease Radius", category: "Sculpt", defaultBinding: { key: "[", ctrl: false, shift: false, alt: false } },
  { id: "sculpt.radius_inc", label: "Increase Radius", category: "Sculpt", defaultBinding: { key: "]", ctrl: false, shift: false, alt: false } },

  // Animation
  { id: "anim.keyframe", label: "Insert Keyframe", category: "Animation", defaultBinding: { key: "i", ctrl: false, shift: false, alt: false } },
  { id: "anim.frame_back", label: "Previous Frame", category: "Animation", defaultBinding: { key: "ArrowLeft", ctrl: false, shift: false, alt: false } },
  { id: "anim.frame_fwd", label: "Next Frame", category: "Animation", defaultBinding: { key: "ArrowRight", ctrl: false, shift: false, alt: false } },
];

function buildDefaultBindings(): Record<string, ShortcutBinding> {
  const map: Record<string, ShortcutBinding> = {};
  for (const action of SHORTCUT_ACTIONS) {
    map[action.id] = { ...action.defaultBinding };
  }
  return map;
}

function loadBindings(): Record<string, ShortcutBinding> {
  try {
    const saved = localStorage.getItem("blendergl_shortcuts");
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, ShortcutBinding>;
      // Merge with defaults so new actions get their defaults
      const defaults = buildDefaultBindings();
      return { ...defaults, ...parsed };
    }
  } catch {
    // ignore
  }
  return buildDefaultBindings();
}

interface ShortcutState {
  bindings: Record<string, ShortcutBinding>;
  panelOpen: boolean;

  setBinding: (actionId: string, binding: ShortcutBinding) => void;
  resetBinding: (actionId: string) => void;
  resetAll: () => void;
  getBinding: (actionId: string) => ShortcutBinding | undefined;
  togglePanel: () => void;
}

export const useShortcutStore = create<ShortcutState>()(
  immer((set, get) => ({
    bindings: loadBindings(),
    panelOpen: false,

    setBinding: (actionId, binding) =>
      set((state) => {
        state.bindings[actionId] = binding;
        localStorage.setItem("blendergl_shortcuts", JSON.stringify(state.bindings));
      }),

    resetBinding: (actionId) =>
      set((state) => {
        const action = SHORTCUT_ACTIONS.find((a) => a.id === actionId);
        if (action) {
          state.bindings[actionId] = { ...action.defaultBinding };
          localStorage.setItem("blendergl_shortcuts", JSON.stringify(state.bindings));
        }
      }),

    resetAll: () =>
      set((state) => {
        state.bindings = buildDefaultBindings();
        localStorage.removeItem("blendergl_shortcuts");
      }),

    getBinding: (actionId) => get().bindings[actionId],

    togglePanel: () =>
      set((state) => {
        state.panelOpen = !state.panelOpen;
      }),
  }))
);

export function formatBinding(binding: ShortcutBinding): string {
  const parts: string[] = [];
  if (binding.ctrl) parts.push("Ctrl");
  if (binding.shift) parts.push("Shift");
  if (binding.alt) parts.push("Alt");
  const keyLabel = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
  parts.push(keyLabel);
  return parts.join("+");
}
