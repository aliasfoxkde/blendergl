import type { AiProvider, AiMessage } from "@/editor/types";

interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

interface AiRequestConfig {
  provider: AiProvider;
  apiKey: string;
  endpoint: string;
  model: string;
  messages: AiMessage[];
}

export async function streamChat(
  config: AiRequestConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  try {
    if (config.provider === "anthropic") {
      await streamAnthropic(config, callbacks);
    } else {
      await streamOpenAI(config, callbacks);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    callbacks.onError(message);
  }
}

async function streamAnthropic(
  config: AiRequestConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  const systemMessage = buildSystemPrompt();

  const body = {
    model: config.model,
    max_tokens: 4096,
    system: systemMessage,
    messages: config.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  };

  const res = await fetch(`${config.endpoint}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("Invalid API key. Check your Anthropic API key.");
    if (status === 429) throw new Error("Rate limited. Please wait a moment and try again.");
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Anthropic API error (${status}): ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          callbacks.onChunk(parsed.delta.text);
        }
        if (parsed.type === "error") {
          callbacks.onError(parsed.error?.message || "Stream error");
          return;
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  callbacks.onDone();
}

async function streamOpenAI(
  config: AiRequestConfig,
  callbacks: StreamCallbacks
): Promise<void> {
  const systemMessage = buildSystemPrompt();

  const body = {
    model: config.model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemMessage },
      ...config.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ],
    stream: true,
  };

  const res = await fetch(`${config.endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 401) throw new Error("Invalid API key. Check your OpenAI API key.");
    if (status === 429) throw new Error("Rate limited. Please wait a moment and try again.");
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`OpenAI API error (${status}): ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          callbacks.onChunk(delta);
        }
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  callbacks.onDone();
}

function buildSystemPrompt(): string {
  return `You are an AI assistant embedded in BlenderGL, a web-based 3D editor similar to Blender. You help users create and manipulate 3D scenes.

You can trigger editor actions by including action blocks in your responses. Use the format [action: name param=value] on its own line.

Available actions:
- [action: generate_object type=cube|sphere|plane|cylinder|cone|torus] — Creates a new 3D object
- [action: set_material albedo=#hexcolor metallic=0.0-1.0 roughness=0.0-1.0] — Applies material to selected entity
- [action: analyze_scene] — Returns scene statistics
- [action: arrange_objects] — Arranges objects in a grid layout

Be concise and helpful. When users ask to create something, use the appropriate action block.`;
}
