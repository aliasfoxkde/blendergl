import { create } from "zustand";
import type { AiMessage } from "@/editor/types";

interface AiState {
  messages: AiMessage[];
  isStreaming: boolean;
  error: string | null;
  panelOpen: boolean;

  addMessage: (message: AiMessage) => void;
  appendToLastMessage: (text: string) => void;
  clearMessages: () => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
}

export const useAiStore = create<AiState>()((set) => ({
  messages: [],
  isStreaming: false,
  error: null,
  panelOpen: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToLastMessage: (text) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = { ...last, content: last.content + text };
      }
      return { messages: msgs };
    }),

  clearMessages: () => set({ messages: [], error: null }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setError: (error) => set({ error, isStreaming: false }),

  setPanelOpen: (open) => set({ panelOpen: open }),

  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
}));
