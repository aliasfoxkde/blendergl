import { useState, useCallback } from "react";
import { useShortcutStore, SHORTCUT_ACTIONS, formatBinding } from "@/editor/stores/shortcutStore";
import type { ShortcutBinding } from "@/editor/stores/shortcutStore";

export function ShortcutsPanel() {
  const { bindings, panelOpen, setBinding, resetBinding, resetAll } = useShortcutStore();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (!panelOpen) return null;

  const handleClose = () => useShortcutStore.getState().togglePanel();

  const handleRecord = useCallback(
    (actionId: string) => {
      setRecordingId(actionId);
      const handler = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const binding: ShortcutBinding = {
          key: e.key,
          ctrl: e.ctrlKey || e.metaKey,
          shift: e.shiftKey,
          alt: e.altKey,
        };
        setBinding(actionId, binding);
        setRecordingId(null);
        window.removeEventListener("keydown", handler);
      };
      window.addEventListener("keydown", handler);
    },
    [setBinding],
  );

  const categories = [...new Set(SHORTCUT_ACTIONS.map((a) => a.category))];
  const filtered = SHORTCUT_ACTIONS.filter(
    (a) =>
      a.label.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="absolute inset-0 z-40 bg-[#1e1e2e] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333]">
        <span className="text-xs font-semibold text-gray-300">Keyboard Shortcuts</span>
        <button onClick={handleClose} className="text-gray-500 hover:text-white text-sm">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-xs text-gray-200">
      <div className="flex items-center justify-between mb-3">
        <span />
        <button
          onClick={resetAll}
          className="px-2 py-1 text-[10px] rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
        >
          Reset All
        </button>
      </div>

      <input
        type="text"
        placeholder="Search shortcuts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-1.5 mb-3 rounded bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 outline-none focus:border-blue-500/50"
      />

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {categories.map((cat) => {
          const catActions = filtered.filter((a) => a.category === cat);
          if (catActions.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-medium">
                {cat}
              </div>
              <div className="space-y-0.5">
                {catActions.map((action) => {
                  const binding = bindings[action.id];
                  const isRecording = recordingId === action.id;
                  return (
                    <div
                      key={action.id}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 group"
                    >
                      <span className="text-gray-300">{action.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            isRecording
                              ? setRecordingId(null)
                              : handleRecord(action.id)
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-mono min-w-[60px] text-center transition ${
                            isRecording
                              ? "bg-blue-500/30 text-blue-300 border border-blue-500/50 animate-pulse"
                              : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/20"
                          }`}
                        >
                          {isRecording
                            ? "..."
                            : binding
                              ? formatBinding(binding)
                              : "—"}
                        </button>
                        <button
                          onClick={() => resetBinding(action.id)}
                          className="opacity-0 group-hover:opacity-100 px-1 py-0.5 text-gray-500 hover:text-gray-300 transition"
                          title="Reset to default"
                        >
                          ↺
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {recordingId && (
        <div className="mt-2 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 text-center">
          Press a key to assign shortcut...{" "}
          <button
            onClick={() => setRecordingId(null)}
            className="ml-2 underline hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
