import type { z } from "zod";

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
