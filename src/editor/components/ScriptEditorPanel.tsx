import { useState, useRef, useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { executeScript, EXAMPLE_SCRIPTS } from "@/editor/utils/scripting/executor";
import {
  listScripts,
  saveScript,
  deleteScript,
  createNewScript,
  exportScripts,
  importScripts,
  getStartupScripts,
} from "@/editor/utils/scripting/persistence";
import type { ScriptResult, ScriptExample } from "@/editor/utils/scripting/executor";
import type { SavedScript } from "@/editor/utils/scripting/persistence";

interface ConsoleEntry {
  level: "log" | "warn" | "error";
  text: string;
}

export function ScriptEditorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState(EXAMPLE_SCRIPTS[0].code);
  const [scriptName, setScriptName] = useState("Untitled Script");
  const [scriptType, setScriptType] = useState<"startup" | "operator">("operator");
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [currentScriptId, setCurrentScriptId] = useState<string | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ScriptResult | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "console" | "library">("editor");
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved scripts on mount and when panel opens
  useEffect(() => {
    if (isOpen) {
      listScripts().then(setSavedScripts);
    }
  }, [isOpen]);

  // Listen for script console events
  useEffect(() => {
    const handleConsole = (e: Event) => {
      const { level, args } = (e as CustomEvent).detail as {
        level: "log" | "warn" | "error";
        args: string[];
      };
      setConsoleEntries((prev) => [
        ...prev,
        ...args.map((text) => ({ level, text })),
      ]);
    };

    const handleClear = () => {
      setConsoleEntries([]);
    };

    window.addEventListener("script-console", handleConsole);
    window.addEventListener("script-console-clear", handleClear);
    return () => {
      window.removeEventListener("script-console", handleConsole);
      window.removeEventListener("script-console", handleClear);
    };
  }, []);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleEntries]);

  const refreshScripts = useCallback(() => {
    listScripts().then(setSavedScripts);
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setConsoleEntries([]);
    setLastResult(null);

    try {
      const result = await executeScript(code, scriptType);
      setLastResult(result);

      // Switch to console tab to show results
      setActiveTab("console");
    } finally {
      setIsRunning(false);
    }
  }, [code, scriptType]);

  const handleSave = useCallback(async () => {
    let script: SavedScript;
    if (currentScriptId) {
      const existing = savedScripts.find((s) => s.id === currentScriptId);
      if (existing) {
        script = { ...existing, name: scriptName, code, type: scriptType, updatedAt: new Date().toISOString() };
      } else {
        script = createNewScript(scriptName, code, scriptType);
        setCurrentScriptId(script.id);
      }
    } else {
      script = createNewScript(scriptName, code, scriptType);
      setCurrentScriptId(script.id);
    }
    await saveScript(script);
    refreshScripts();
  }, [currentScriptId, scriptName, code, scriptType, savedScripts, refreshScripts]);

  const handleLoadScript = useCallback((script: SavedScript) => {
    setCode(script.code);
    setScriptName(script.name);
    setScriptType(script.type);
    setCurrentScriptId(script.id);
    setActiveTab("editor");
  }, []);

  const handleDeleteScript = useCallback(async (id: string) => {
    await deleteScript(id);
    if (currentScriptId === id) {
      setCurrentScriptId(null);
      setScriptName("Untitled Script");
    }
    refreshScripts();
  }, [currentScriptId, refreshScripts]);

  const handleNewScript = useCallback(() => {
    setCurrentScriptId(null);
    setScriptName("Untitled Script");
    setCode("// New script\n");
    setActiveTab("editor");
  }, []);

  const handleExportAll = useCallback(async () => {
    const scripts = await listScripts();
    if (scripts.length === 0) return;
    const json = await exportScripts(scripts);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blendergl-scripts.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importScripts(text);
      refreshScripts();
    } catch (err) {
      console.error("Failed to import scripts:", err);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [refreshScripts]);

  const handleLoadExample = useCallback((example: ScriptExample) => {
    setCode(example.code);
    setScriptName(example.name);
    setCurrentScriptId(null);
    setActiveTab("editor");
  }, []);

  const handleClearConsole = useCallback(() => {
    setConsoleEntries([]);
    setLastResult(null);
  }, []);

  const handleRunStartupScripts = useCallback(async () => {
    const scripts = await getStartupScripts();
    if (scripts.length === 0) {
      setConsoleEntries((prev) => [...prev, { level: "log", text: "No startup scripts configured." }]);
      setActiveTab("console");
      return;
    }
    setConsoleEntries([]);
    setLastResult(null);
    setIsRunning(true);
    setActiveTab("console");

    for (const script of scripts) {
      setConsoleEntries((prev) => [...prev, { level: "log", text: `--- Running: ${script.name} ---` }]);
      const result = await executeScript(script.code, "startup");
      if (!result.success) {
        setConsoleEntries((prev) => [...prev, { level: "error", text: `Startup script "${script.name}" failed: ${result.error}` }]);
        break;
      }
    }

    setIsRunning(false);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10
          px-3 py-1.5 bg-[#333] hover:bg-[#444] border border-[#555] rounded-t
          text-xs text-gray-300 transition flex items-center gap-1.5"
        title="Open Script Editor"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1.75C4 1.336 4.336 1 4.75 1h6.5c.414 0 .75.336.75.75v3.5c0 .414-.336.75-.75.75h-1.5v1.5h1.5c.414 0 .75.336.75.75v3.5c0 .414-.336.75-.75.75h-6.5c-.414 0-.75-.336-.75-.75V8.25c0-.414.336-.75.75-.75h1.5V6H4.75C4.336 6 4 5.664 4 5.25v-3.5zM6 6h4v1H6V6zm0 3h4v2.5H6V9z" />
        </svg>
        Script Editor
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 bg-[#1e1e1e] border-t border-[#444] flex flex-col"
      style={{ height: "320px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#2a2a2a] border-b border-[#444] shrink-0">
        <div className="flex items-center gap-3">
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-200 transition"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>

          {/* Script name */}
          <input
            type="text"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="bg-transparent text-xs text-gray-200 w-32 focus:outline-none focus:bg-[#333] rounded px-1"
            title="Script name"
          />

          {/* Type selector */}
          <select
            value={scriptType}
            onChange={(e) => setScriptType(e.target.value as "startup" | "operator")}
            className="bg-[#333] text-gray-300 text-xs px-1.5 py-0.5 rounded border border-[#555]"
            title="Script type"
          >
            <option value="operator">Operator</option>
            <option value="startup">Startup</option>
          </select>

          {/* Tabs */}
          <button
            onClick={() => setActiveTab("editor")}
            className={`text-xs px-2 py-0.5 rounded transition ${
              activeTab === "editor"
                ? "bg-[#444] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab("console")}
            className={`text-xs px-2 py-0.5 rounded transition flex items-center gap-1 ${
              activeTab === "console"
                ? "bg-[#444] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Console
            {consoleEntries.length > 0 && (
              <span className="bg-blue-500 text-white text-[9px] px-1 rounded-full">
                {consoleEntries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`text-xs px-2 py-0.5 rounded transition ${
              activeTab === "library"
                ? "bg-[#444] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Library ({savedScripts.length})
          </button>

          {/* Saved scripts dropdown */}
          <select
            className="bg-[#333] text-gray-300 text-xs px-1.5 py-0.5 rounded border border-[#555]"
            value=""
            onChange={(e) => {
              if (e.target.value === "__new__") {
                handleNewScript();
              } else if (e.target.value === "__run_startup__") {
                handleRunStartupScripts();
              } else if (e.target.value.startsWith("__example__")) {
                const name = e.target.value.replace("__example__", "");
                const example = EXAMPLE_SCRIPTS.find((ex) => ex.name === name);
                if (example) handleLoadExample(example);
              } else {
                const script = savedScripts.find((s) => s.id === e.target.value);
                if (script) handleLoadScript(script);
              }
              e.target.value = "";
            }}
            title="Load saved script"
          >
            <option value="" disabled>Load Script...</option>
            {savedScripts.length > 0 && (
              <optgroup label="Saved Scripts">
                {savedScripts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Actions">
              <option value="__new__">+ New Script</option>
              <option value="__run_startup__">Run Startup Scripts</option>
            </optgroup>
            <optgroup label="Examples">
              {EXAMPLE_SCRIPTS.map((ex) => (
                <option key={ex.name} value={`__example__${ex.name}`}>
                  {ex.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Save button */}
          <button
            onClick={handleSave}
            className="px-2 py-0.5 rounded text-xs text-gray-300 hover:bg-[#444] transition"
            title="Save script (Ctrl+S)"
          >
            Save
          </button>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`px-3 py-0.5 rounded text-xs font-medium transition flex items-center gap-1 ${
              isRunning
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500 text-white"
            }`}
            title="Run script (Ctrl+Enter)"
          >
            {isRunning ? (
              <>
                <span className="inline-block w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 1l7 4-7 4V1z" />
                </svg>
                Run
              </>
            )}
          </button>

          {/* Clear console */}
          <button
            onClick={handleClearConsole}
            className="text-gray-400 hover:text-gray-200 text-xs transition"
            title="Clear console"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {activeTab === "editor" ? (
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 8 },
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
            }}
          />
        ) : activeTab === "console" ? (
          <div className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-0.5">
            {consoleEntries.length === 0 && (
              <div className="text-gray-500 italic">No output yet. Run a script to see output here.</div>
            )}
            {consoleEntries.map((entry, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap break-all ${
                  entry.level === "error"
                    ? "text-red-400"
                    : entry.level === "warn"
                      ? "text-yellow-400"
                      : "text-gray-300"
                }`}
              >
                {entry.level === "error" && (
                  <span className="text-red-500 mr-1">{">>>"}</span>
                )}
                {entry.level === "warn" && (
                  <span className="text-yellow-500 mr-1">{"//! "}</span>
                )}
                {entry.level === "log" && (
                  <span className="text-gray-500 mr-1">{">"}</span>
                )}
                {entry.text}
              </div>
            ))}
            {lastResult && (
              <div className="border-t border-[#444] mt-2 pt-2">
                <span className={`text-xs ${lastResult.success ? "text-green-400" : "text-red-400"}`}>
                  {lastResult.success ? "Completed" : "Failed"} in {lastResult.duration.toFixed(0)}ms
                </span>
              </div>
            )}
            <div ref={consoleEndRef} />
          </div>
        ) : (
          /* Library tab */
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Script Library ({savedScripts.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewScript}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  + New
                </button>
                <button
                  onClick={handleExportAll}
                  className="text-xs text-gray-400 hover:text-gray-200 transition"
                  title="Export all scripts as JSON"
                >
                  Export
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-gray-400 hover:text-gray-200 transition"
                  title="Import scripts from JSON"
                >
                  Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </div>
            </div>

            {/* Startup scripts section */}
            {savedScripts.filter((s) => s.type === "startup").length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Startup Scripts (auto-run on load)
                </div>
                {savedScripts
                  .filter((s) => s.type === "startup")
                  .map((script) => (
                    <ScriptListItem
                      key={script.id}
                      script={script}
                      isActive={script.id === currentScriptId}
                      onLoad={handleLoadScript}
                      onDelete={handleDeleteScript}
                    />
                  ))}
              </div>
            )}

            {/* Operator scripts section */}
            {savedScripts.filter((s) => s.type === "operator").length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Operator Scripts
                </div>
                {savedScripts
                  .filter((s) => s.type === "operator")
                  .map((script) => (
                    <ScriptListItem
                      key={script.id}
                      script={script}
                      isActive={script.id === currentScriptId}
                      onLoad={handleLoadScript}
                      onDelete={handleDeleteScript}
                    />
                  ))}
              </div>
            )}

            {savedScripts.length === 0 && (
              <div className="text-gray-500 text-xs text-center py-8">
                No saved scripts yet.
                <br />
                Write a script in the Editor tab and click Save.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Individual script item in the library list. */
function ScriptListItem({
  script,
  isActive,
  onLoad,
  onDelete,
}: {
  script: SavedScript;
  isActive: boolean;
  onLoad: (s: SavedScript) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded mb-1 group cursor-pointer transition ${
        isActive ? "bg-[#333]" : "hover:bg-[#2a2a2a]"
      }`}
      onClick={() => onLoad(script)}
    >
      <div className="min-w-0">
        <div className={`text-xs truncate ${isActive ? "text-white" : "text-gray-300"}`}>
          {script.name}
        </div>
        <div className="text-[10px] text-gray-500">
          {script.type} &middot; {new Date(script.updatedAt).toLocaleDateString()}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${script.name}"?`)) {
            onDelete(script.id);
          }
        }}
        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs ml-2"
        title="Delete script"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1l8 8M9 1l-8 8" />
        </svg>
      </button>
    </div>
  );
}
