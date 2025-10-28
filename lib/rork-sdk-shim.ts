import { useCallback, useMemo, useState } from "react";
import type { z } from "zod";

export type RorkMessagePartText = { type: "text"; text: string };
export type RorkMessagePartTool = {
  type: "tool";
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  toolName: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

export type RorkMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: (RorkMessagePartText | RorkMessagePartTool)[];
};

export function useRorkAgent(_params: { tools: Record<string, unknown> }) {
  const [messages, setMessages] = useState<RorkMessage[]>([]);
  const error = useMemo(() => new Error("AI está desativada neste deploy (sem Backend)"), []);

  const sendMessage = useCallback(async (input: string | { text: string }) => {
    const text = typeof input === "string" ? input : input.text;
    const userMsg: RorkMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      parts: [{ type: "text", text }],
    };
    const assistantMsg: RorkMessage = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      parts: [
        {
          type: "tool",
          state: "output-error",
          toolName: "ai",
          errorText:
            "AI indisponível neste ambiente. Ative Backend no topo para usar funcionalidades de IA.",
        },
      ],
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  }, []);

  const addToolResult = useCallback((toolName: string, output: unknown) => {
    const toolMsg: RorkMessage = {
      id: `${Date.now()}-tool`,
      role: "assistant",
      parts: [
        {
          type: "tool",
          state: "output-available",
          toolName,
          output,
        },
      ],
    };
    setMessages((prev) => [...prev, toolMsg]);
  }, []);

  return { messages, error, sendMessage, addToolResult, setMessages };
}

export function createRorkTool<TInput>(_config: {
  description: string;
  zodSchema: z.ZodType<TInput>;
  execute?: (input: TInput) => void | Promise<void>;
}) {
  return {} as unknown;
}

export async function generateObject<TSchema extends z.ZodType<any>>(_params: {
  messages: { role: "user" | "assistant"; content: string | { type: "text"; text: string }[] }[];
  schema: TSchema;
}): Promise<z.infer<TSchema>> {
  const err = new Error(
    "AI generation is unavailable in this deployment. Enable Backend in the header to use AI features."
  );
  console.warn("rork-sdk-shim.generateObject called without backend", _params);
  throw err;
}

export async function generateText(
  _params: string | { messages: { role: "user" | "assistant"; content: string }[] }
): Promise<string> {
  const err = new Error(
    "AI generation is unavailable in this deployment. Enable Backend in the header to use AI features."
  );
  console.warn("rork-sdk-shim.generateText called without backend", _params);
  throw err;
}
