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
    const kws = parseKeywords(prompt);
    const title = uniqueTitleFromKeywords(kws);
    const content = buildLocalSpeech(prompt, kws);
    const result: any = { title, keywords: kws, content };
    return result as z.infer<TSchema>;
  }

  if (/\b(discurso|speech)\b/i.test(prompt)) {
    const title = uniqueTitleFromKeywords([]);
    const content = buildLocalSpeech(prompt, []);
    const keywords = suggestKeywords(content);
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

function rand(seed: number) {
  let s = Math.abs(seed) % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function parseKeywords(text: string): string[] {
  const m = text.match(/palavras[^:]*:\s*([^\n]+)/i);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .slice(0, 12);
}

function uniqueTitleFromKeywords(kws: string[]): string {
  const base = kws.length > 0 ? `${capitalize(kws[0])}: Compromisso com Portugal` : "Discurso ao País";
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
  return `${base} ${stamp}`;
}

function suggestKeywords(content: string): string[] {
  const pool = [
    "Portugal",
    "economia",
    "famílias",
    "saúde",
    "educação",
    "segurança",
    "justiça",
    "PME",
    "confiança",
    "transparência",
    "inovação",
    "meritocracia",
  ];
  const picked: string[] = [];
  for (const w of pool) if (content.toLowerCase().includes(w)) picked.push(w);
  return picked.slice(0, 10);
}

function buildLocalSpeech(topic: string, kws: string[] = []): string {
  const seed = Date.now();
  const rnd = rand(seed);
  const theme = topic.replace(/\s+/g, " ").slice(0, 160);
  const openings = [
    "Portugueses e Portuguesas,",
    "Amigos, compatriotas,",
    "Boa noite a todos,",
    "Caros concidadãos,",
  ];
  const opening = openings[Math.floor(rnd() * openings.length)];
  const focus = kws.length > 0 ? `com foco em ${kws.join(", ")}` : "";
  const p1 = `${opening}\nHoje falamos de ${theme} ${focus}. O nosso compromisso é simples: dignidade para as pessoas, oportunidades para quem trabalha e confiança nas instituições.`;
  const axes = buildAxes(kws, rnd);
  const p2 = `Três eixos de ação: ${axes.join("; ")}. Cada medida terá calendário, metas públicas e avaliação independente.`;
  const p3 = buildMeasures(kws, rnd);
  const closing = buildClosing(kws, rnd);
  return [p1, "", p2, "", p3, "", closing].join("\n");
}

function buildAxes(kws: string[], rnd: () => number): string[] {
  const options = [
    "contas certas e transparência",
    "serviços públicos próximos e digitais",
    "alívio fiscal ao trabalho e às PME",
    "segurança nas ruas e justiça célere",
    "crescimento com inovação e qualificação",
    "apoio às famílias e habitação acessível",
  ];
  const list = [...options];
  const result: string[] = [];
  for (let i = 0; i < 4 && list.length; i++) {
    const idx = Math.floor(rnd() * list.length);
    result.push(list.splice(idx, 1)[0]);
  }
  if (kws.length > 0) result[0] = `${result[0]} — ${kws.slice(0, 3).join(", ")}`;
  return result.slice(0, 3);
}

function buildMeasures(kws: string[], rnd: () => number): string {
  const pick = <T,>(arr: T[], n: number) => {
    const a = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n && a.length; i++) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]);
    return out;
  };
  const measures = [
    "reduzir prazos de resposta do Estado",
    "simplificar licenças e cortar burocracia",
    "linha de apoio a PME exportadoras",
    "médico de família para todos",
    "programa nacional de literacia digital",
    "reforço da polícia de proximidade",
    "acordo fiscal para jovens trabalhadores",
    "transparência total nas compras públicas",
  ];
  const chosen = pick(measures, 4);
  const withKw = kws.slice(0, 4).map((k) => `prioridade em ${k}`);
  const bullets = [...chosen, ...withKw].slice(0, 5).map((t) => `• ${capitalize(t)}`).join("\n");
  return `Plano imediato:\n${bullets}`;
}

function buildClosing(kws: string[], rnd: () => number): string {
  const closings = [
    "Com trabalho sério e coragem, faremos um Portugal mais justo.",
    "Sem promessas vazias: resultados, respeito e futuro.",
    "É tempo de unir o país em torno de objetivos claros.",
    "Com cada um de vós, vamos transformar expectativas em conquistas.",
  ];
  let c = closings[Math.floor(rnd() * closings.length)];
  if (kws.length) c += ` Pelas ${kws[0]} e pelas futuras gerações.`;
  return c + " Muito obrigado.";
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
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
