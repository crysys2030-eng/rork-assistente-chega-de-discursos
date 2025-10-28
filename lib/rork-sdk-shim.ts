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
  const error = useMemo(() => null, []);

  const sendMessage = useCallback(async (input: string | { text: string }) => {
    const text = typeof input === "string" ? input : input.text;
    const userMsg: RorkMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      parts: [{ type: "text", text }],
    };

    const reply = createLocalReply(text);
    const assistantMsg: RorkMessage = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      parts: [{ type: "text", text: reply }],
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

function createLocalReply(input: string): string {
  const base = "Modo IA Local (offline)";
  const advice =
    "Estou a funcionar sem servidor de IA. Para respostas mais avançadas, ative Backend no topo e refaça o deploy.";
  const normalized = input.trim().replace(/\s+/g, " ");
  const summary = normalized.length > 220 ? normalized.slice(0, 220) + "…" : normalized;
  return `${base}: percebi a sua questão — \"${summary}\". ${advice}`;
}

export function createRorkTool<TInput>(_config: {
  description: string;
  zodSchema: z.ZodType<TInput>;
  execute?: (input: TInput) => void | Promise<void>;
}) {
  return {} as unknown;
}

export async function generateObject<TSchema extends z.ZodType<any>>(
  params: {
    messages: { role: "user" | "assistant"; content: string | { type: "text"; text: string }[] }[];
    schema: TSchema;
  }
): Promise<z.infer<TSchema>> {
  console.warn("rork-sdk-shim.generateObject: using local fallback");
  const prompt = extractPrompt(params.messages);

  if (/\b(t[íi]tulo|palavras?[- ]?chave|temas?)\b/i.test(prompt)) {
    const baseTitle = uniqueTitle("Mensagem à Comunicação Social");
    const kw = ["pluralismo", "responsabilidade", "Portugal", "transparência", "segurança", "economia"].slice(0, 6);
    const content = buildLocalSpeech(prompt);
    const result: any = { title: baseTitle, keywords: kw, content };
    return result as z.infer<TSchema>;
  }

  if (/\b(discurso|speech)\b/i.test(prompt)) {
    const title = uniqueTitle("Discurso ao País");
    const content = buildLocalSpeech(prompt);
    const keywords = ["Portugal", "valores", "economia", "famílias", "segurança", "confiança"];
    const result: any = { title, content, keywords };
    return result as z.infer<TSchema>;
  }

  if (/(minuta|atas|reuni[aã]o|minutes)/i.test(prompt)) {
    const result: any = buildLocalMinutes(prompt);
    return result as z.infer<TSchema>;
  }

  if (/(tarefas|lista de tarefas|task list|to-?do|plano)/i.test(prompt)) {
    const result: any = buildLocalTaskList(prompt);
    return result as z.infer<TSchema>;
  }

  throw new Error(
    "IA local não consegue gerar este tipo de conteúdo. Ative Backend para capacidades completas."
  );
}

export async function generateText(
  params: string | { messages: { role: "user" | "assistant"; content: string }[] }
): Promise<string> {
  console.warn("rork-sdk-shim.generateText: using local fallback");
  const prompt = typeof params === "string" ? params : params.messages.map((m) => m.content).join("\n\n");
  return createLocalReply(prompt);
}

function extractPrompt(
  msgs: { role: "user" | "assistant"; content: string | { type: "text"; text: string }[] }[]
): string {
  const parts: string[] = [];
  for (const m of msgs) {
    if (typeof m.content === "string") parts.push(m.content);
    else parts.push(m.content.map((p) => (p as any).text ?? "").join("\n"));
  }
  return parts.join("\n\n");
}

function buildLocalSpeech(topic: string): string {
  const theme = topic.replace(/\s+/g, " ").slice(0, 160);
  const header = "Portugueses e Portuguesas,";
  const para1 = `Hoje, com clareza e respeito, falamos de ${theme}. O nosso compromisso é com a verdade, com a segurança das pessoas, com a economia que cria oportunidades e com o mérito de quem trabalha.`;
  const para2 = `Queremos um Estado que funcione: serviços públicos próximos, justiça célere, apoio real às famílias e liberdade para empreender. Combateremos privilégios, ineficiências e a corrupção que mina a confiança.`;
  const para3 = `Propomos metas concretas: reduzir prazos de resposta do Estado, aliviar a carga fiscal sobre o trabalho, apoiar PME e qualificar a administração. Transparência total, contas certas e avaliação de resultados.`;
  const close = "Juntos, com coragem e responsabilidade, construiremos um Portugal mais justo. Muito obrigado.";
  return [header, "", para1, "", para2, "", para3, "", close].join("\n");
}

function uniqueTitle(base: string): string {
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  return `${base} ${stamp}`;
}

function buildLocalSources() {
  return [
    {
      title: "Constituição da República Portuguesa",
      url: "https://dre.pt/legislacao-consolidada/",
      relevance: "Enquadra princípios de soberania e organização do Estado",
    },
    {
      title: "Instituto Nacional de Estatística (INE)",
      url: "https://www.ine.pt/",
      relevance: "Dados oficiais para fundamentar indicadores citados",
    },
  ];
}

function buildLocalTaskList(_topic: string) {
  const title = "Plano Operacional — Tarefas Prioritárias";
  const description = "Conjunto de ações concretas e mensuráveis para execução imediata";
  const baseTask = (t: string, p: "high" | "medium" | "low" = "medium") => ({
    title: t,
    description: `${t} — detalhar responsáveis, prazos e métricas de sucesso`,
    priority: p,
    deadline: "2 semanas",
    assignedTo: "Equipa",
  });
  const tasks = [
    baseTask("Definir objetivos e KPIs", "high"),
    baseTask("Mapear stakeholders-chave", "high"),
    baseTask("Plano de comunicação multicanal", "high"),
    baseTask("Calendário de execução semanal", "medium"),
    baseTask("Mecanismo de monitorização e reporting", "medium"),
    baseTask("Checklist de conformidade legal"),
    baseTask("Reunião de arranque e atribuição de responsáveis", "high"),
    baseTask("Roadmap de riscos e mitigação", "medium"),
  ];
  return { title, description, tasks };
}

function buildLocalMinutes(_topic: string) {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
  const attendees = ["André Ventura", "Coordenação Distrital", "Equipa de Comunicação"];
  const topics = [
    "Estratégia de mobilização",
    "Combate à corrupção",
    "Agenda de eventos",
  ];
  const summary =
    "Reunião focada em mobilização nacional, definição de prioridades e calendarização de ações. Foram alinhadas mensagens-chave e responsabilidades por equipa.";
  const tasks = [
    { task: "Definir calendário de comícios por distrito", priority: "high", assignedTo: "Coordenação Distrital", deadline: "14/11/2025" },
    { task: "Plano de comunicação para redes sociais", priority: "medium", assignedTo: "Equipa de Comunicação", deadline: "21/11/2025" },
    { task: "Reunião com apoiantes locais", priority: "low" },
  ];
  return { date, attendees, topics, summary, tasks };
}
