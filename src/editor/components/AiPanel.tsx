import { useState, useRef, useEffect, useCallback } from "react";
import { useAiStore } from "@/editor/stores/aiStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { streamChat } from "@/editor/utils/ai/client";
import { parseActions, executeAction } from "@/editor/utils/ai/tools";
import type { AiMessage } from "@/editor/types";

export function AiPanel() {
  const messages = useAiStore((s) => s.messages);
  const isStreaming = useAiStore((s) => s.isStreaming);
  const error = useAiStore((s) => s.error);
  const panelOpen = useAiStore((s) => s.panelOpen);
  const addMessage = useAiStore((s) => s.addMessage);
  const appendToLastMessage = useAiStore((s) => s.appendToLastMessage);
  const setStreaming = useAiStore((s) => s.setStreaming);
  const setError = useAiStore((s) => s.setError);
  const clearMessages = useAiStore((s) => s.clearMessages);

  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const aiApiKey = useSettingsStore((s) => s.aiApiKey);
  const aiEndpoint = useSettingsStore((s) => s.aiEndpoint);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const setAiEnabled = useSettingsStore((s) => s.setAiEnabled);

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!aiEnabled || !aiApiKey) {
      setError("AI is disabled or no API key configured. Open settings to set up.");
      return;
    }

    const userMsg: AiMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsg: AiMessage = {
      id: `msg_${Date.now() + 1}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    addMessage(assistantMsg);
    setInput("");
    setError(null);
    setStreaming(true);

    const allMessages = [...useAiStore.getState().messages, userMsg];

    streamChat(
      {
        provider: aiProvider,
        apiKey: aiApiKey,
        endpoint: aiEndpoint,
        model: aiModel,
        messages: allMessages.filter((m) => m.role === "user" || m.role === "assistant"),
      },
      {
        onChunk: (chunk) => {
          appendToLastMessage(chunk);
        },
        onDone: () => {
          setStreaming(false);
          // Parse and execute any action blocks in the response
          const lastMsg = useAiStore.getState().messages;
          const fullResponse = lastMsg[lastMsg.length - 1]?.content || "";
          const actions = parseActions(fullResponse);
          for (const action of actions) {
            const result = executeAction(action);
            if (result.success) {
              addMessage({
                id: `tool_${Date.now()}`,
                role: "assistant",
                content: result.message,
                timestamp: Date.now(),
              });
            }
          }
        },
        onError: (err) => {
          setError(err);
        },
      }
    );
  }, [input, isStreaming, aiEnabled, aiApiKey, aiProvider, aiEndpoint, aiModel, addMessage, appendToLastMessage, setStreaming, setError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!panelOpen) return null;

  return (
    <div className="flex flex-col border-t border-[#333]" style={{ height: "280px", minHeight: "200px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2a2a2a] border-b border-[#333] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-300">AI Assistant</span>
          <span className="text-[10px] text-gray-500">
            {aiProvider}/{aiModel.split("/").pop()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            title="Settings"
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition text-xs"
            onClick={() => setShowSettings(!showSettings)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
          <button
            title="Clear chat"
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-300 transition text-xs"
            onClick={clearMessages}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Settings (collapsible) */}
      {showSettings && (
        <div className="px-3 py-2 bg-[#252525] border-b border-[#333] space-y-2 shrink-0 overflow-auto" style={{ maxHeight: "140px" }}>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="accent-blue-500"
            />
            Enable AI
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => useSettingsStore.getState().setAiProvider(e.target.value as "anthropic" | "openai")}
                className="w-full bg-[#333] text-gray-300 text-xs px-2 py-1 rounded border border-[#444]"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Model</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => useSettingsStore.getState().setAiModel(e.target.value)}
                className="w-full bg-[#333] text-gray-300 text-xs px-2 py-1 rounded border border-[#444]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">API Key</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => useSettingsStore.getState().setAiApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#333] text-gray-300 text-xs px-2 py-1 rounded border border-[#444]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Endpoint</label>
              <input
                type="text"
                value={aiEndpoint}
                onChange={(e) => useSettingsStore.getState().setAiEndpoint(e.target.value)}
                className="w-full bg-[#333] text-gray-300 text-xs px-2 py-1 rounded border border-[#444]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-xs text-gray-600 text-center py-4">
            Ask me to create objects, analyze your scene, or apply materials.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-xs rounded px-2 py-1.5 ${
              msg.role === "user"
                ? "bg-blue-600/20 text-blue-200 ml-6"
                : "bg-[#333] text-gray-300 mr-4"
            }`}
          >
            <pre className="whitespace-pre-wrap font-sans break-words">{msg.content}</pre>
          </div>
        ))}
        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 rounded px-2 py-1.5">
            {error}
          </div>
        )}
        {isStreaming && (
          <div className="text-xs text-gray-500 animate-pulse">Thinking...</div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#333] shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={aiEnabled && aiApiKey ? "Ask AI..." : "Configure API key in settings..."}
          disabled={isStreaming}
          className="flex-1 bg-[#333] text-gray-300 text-xs px-2 py-1.5 rounded border border-[#444] focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
          className="w-6 h-6 flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
