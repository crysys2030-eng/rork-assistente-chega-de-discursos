declare module "@rork/toolkit-sdk" {
  import type { z } from "zod";
  import type { ReactNode } from "react";

  export type ToolUIPart = unknown;

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
    id?: string;
    role: "user" | "assistant" | "system";
    parts: (RorkMessagePartText | RorkMessagePartTool)[];
  };

  export type SendMessageInput = string | { text: string };

  export type UseRorkAgentReturn = {
    messages: RorkMessage[];
    error?: Error | null;
    sendMessage: (input: SendMessageInput) => Promise<void>;
    addToolResult: (toolName: string, output: unknown) => void;
    setMessages: (updater: RorkMessage[] | ((prev: RorkMessage[]) => RorkMessage[])) => void;
  };

  export function useRorkAgent(params: {
    tools: Record<string, unknown>;
  }): UseRorkAgentReturn;

  export function createRorkTool<TInput>(config: {
    description: string;
    zodSchema: z.ZodType<TInput>;
    execute?: (input: TInput) => void | Promise<void>;
  }): unknown;

  export async function generateObject<TSchema extends z.ZodType<any>>(params: {
    messages: { role: "user" | "assistant"; content: string | { type: "text"; text: string }[] }[];
    schema: TSchema;
  }): Promise<z.infer<TSchema>>;

  export async function generateText(
    params: string | { messages: { role: "user" | "assistant"; content: string }[] }
  ): Promise<string>;
}
