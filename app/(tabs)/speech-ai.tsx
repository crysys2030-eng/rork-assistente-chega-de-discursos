import { generateObject } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Copy, Loader2, Megaphone, Plus, Sparkles, Trash2, Wand2 } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";

interface SpeechDraft {
  id: string;
  title: string;
  keywords: string[];
  audience: string;
  tone: "institucional" | "mobilizador" | "técnico" | "comício";
  durationMinutes: number;
  outline: string[];
  speech: string;
  createdAt: Date;
}

const [SpeechContext, useSpeech] = createContextHook(() => {
  const [drafts, setDrafts] = useState<SpeechDraft[]>([]);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["speech-drafts"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("speech-drafts");
      if (!stored) return [] as SpeechDraft[];
      const parsed = JSON.parse(stored) as any[];
      return parsed.map((d) => ({
        ...d,
        createdAt: new Date(d?.createdAt ?? Date.now()),
        keywords: Array.isArray(d?.keywords) ? d.keywords : [],
        outline: Array.isArray(d?.outline) ? d.outline : [],
        title: d?.title ?? "",
        audience: d?.audience ?? "",
        tone: (d?.tone as SpeechDraft["tone"]) ?? "institucional",
        durationMinutes: Number(d?.durationMinutes ?? 5),
        speech: d?.speech ?? "",
        id: String(d?.id ?? Date.now()),
      }));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (next: SpeechDraft[]) => {
      await AsyncStorage.setItem("speech-drafts", JSON.stringify(next));
      return next;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speech-drafts"] });
    },
  });
  const { mutate: syncDrafts } = syncMutation;

  useEffect(() => {
    if (query.data) setDrafts(query.data);
  }, [query.data]);

  const addDraft = useCallback((d: SpeechDraft) => {
    const next = [...drafts, d];
    setDrafts(next);
    syncDrafts(next);
  }, [drafts, syncDrafts]);

  const removeDraft = useCallback((id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    syncDrafts(next);
  }, [drafts, syncDrafts]);

  return useMemo(() => ({ drafts, addDraft, removeDraft, isLoading: query.isLoading }), [drafts, addDraft, removeDraft, query.isLoading]);
});

function SpeechAIScreen() {
  const insets = useSafeAreaInsets();
  const { drafts, addDraft, removeDraft } = useSpeech();

  const [title, setTitle] = useState<string>("");
  const [keywords, setKeywords] = useState<string>("");
  const [audience, setAudience] = useState<string>("População em geral");
  const [tone, setTone] = useState<SpeechDraft["tone"]>("institucional");
  const [duration, setDuration] = useState<string>("7");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const confirmAsync = useCallback((titleText: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        const ok = globalThis.confirm ? globalThis.confirm(`${titleText}\n\n${message}`) : true;
        resolve(ok);
        return;
      }
      Alert.alert(titleText, message, [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }, []);

  const generateThemes = useCallback(async () => {
    setIsGeneratingThemes(true);
    try {
      const last = [...drafts]
        .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).getTime() - (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).getTime())[0];
      const lastTitle = last?.title ?? "";
      const lastKeywords = Array.isArray(last?.keywords) ? last.keywords.join(", ") : "";
      const schema = z.object({ title: z.string().min(6).max(100), keywords: z.array(z.string()).min(3).max(8) });
      const prompt = `Gera um TÍTULO e PALAVRAS‑CHAVE para um novo discurso político (PT‑PT) totalmente diferentes do anterior. Público‑alvo: ${audience}. Tom: ${tone}. Evita repetir ou parafrasear o anterior. Anterior: título="${lastTitle}", keywords=[${lastKeywords}]. Responde apenas com JSON.`;
      const res = await generateObject({ messages: [{ role: "user", content: prompt }], schema });
      const kws = (res.keywords ?? []).map((k: string) => k.trim()).filter(Boolean);
      setTitle(res.title ?? "");
      setKeywords(kws.join(", "));
      return { title: res.title as string, keywords: kws as string[] };
    } catch (e) {
      console.error("generateThemes error", e);
      Alert.alert("Erro", "Não foi possível gerar novos temas. Tente novamente.");
      return null;
    } finally {
      setIsGeneratingThemes(false);
    }
  }, [audience, tone, drafts]);

  const handleGenerate = async () => {
    let usedTitle = title.trim();
    let kwArray = keywords.split(",").map((k) => k.trim()).filter(Boolean);

    if (!usedTitle || kwArray.length === 0) {
      const themes = await generateThemes();
      if (!themes) return;
      usedTitle = themes.title;
      kwArray = themes.keywords;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        outline: z.array(z.string()).describe("Esqueleto do discurso por pontos"),
        speech: z.string().describe("Texto do discurso final em PT‑PT, com secções claras e tempo aproximado"),
        compliance_notes: z
          .array(z.string())
          .describe("Notas de conformidade com leis portuguesas de comunicação social: imparcialidade, responsabilidade, ausência de incitação ao ódio, transparência"),
      });

      const sysPrompt = `Gera um discurso político em português de Portugal, adequado para comunicação social, obedecendo às normas legais portuguesas (pluralismo, responsabilidade, respeito pelos direitos fundamentais e rejeição de incitação ao ódio). Ajusta o comprimento para cerca de ${Number(duration) || 7} minutos. Público-alvo: ${audience}. Tom: ${tone}. Palavras‑chave obrigatórias (usar de forma natural): ${kwArray.join(", ")}. Título: ${usedTitle}. Estrutura: abertura forte, 3-5 pontos principais com dados e compromissos verificáveis, call to action final. Evita afirmações factualmente não comprovadas. Não repitas conteúdos ou temas do último discurso salvo se estritamente necessário.`;

      const result = await generateObject({
        messages: [{ role: "user", content: sysPrompt }],
        schema,
      });

      const outlineSafe: string[] = Array.isArray((result as any)?.outline)
        ? ((result as any).outline as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
        : [];
      const speechSafe: string = typeof (result as any)?.speech === "string" ? (result as any).speech : "";
      if (speechSafe.trim().length === 0) {
        console.warn("Speech AI: empty speech from AI, aborting addDraft");
        throw new Error("Conteúdo vazio");
      }

      const draft: SpeechDraft = {
        id: Date.now().toString(),
        title: usedTitle,
        keywords: kwArray,
        audience,
        tone,
        durationMinutes: Number(duration) || 7,
        outline: outlineSafe,
        speech: speechSafe,
        createdAt: new Date(),
      };
      addDraft(draft);
      setTitle("");
      setKeywords("");
      setAudience("População em geral");
      setTone("institucional");
      setDuration("7");
      Alert.alert("Sucesso", "Discurso gerado com IA.");
    } catch (e) {
      console.error("speech-ai generate error", e);
      Alert.alert("Erro", "Não foi possível gerar o discurso. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async (d: SpeechDraft) => {
    const fileName = `discurso_${d.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.txt`;
    const content = `TÍTULO: ${d.title}\n\nPALAVRAS‑CHAVE: ${d.keywords.join(", ")}\nPÚBLICO‑ALVO: ${d.audience}\nTOM: ${d.tone}\nDURAÇÃO: ${d.durationMinutes} min\n\nESBOÇO:\n${(Array.isArray(d.outline) ? d.outline : []).map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nDISCURSO:\n${d.speech}`;

    try {
      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert("Sucesso", "Documento transferido!");
      } else {
        await Share.share({ title: d.title, message: content });
      }
    } catch (e) {
      console.error('speech export error', e);
      Alert.alert('Erro', 'Não foi possível exportar. Use copiar.');
    }
  };

  const deleteDraft = async (id: string) => {
    const ok = await confirmAsync('Eliminar', 'Deseja eliminar este discurso?');
    if (ok) removeDraft(id);
  };

  return (
    <View style={styles.container} testID="speechAiScreen">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}
        testID="speechHeader">
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📣 Discurso IA</Text>
              <Text style={styles.headerSubtitle}>Geração profissional (PT‑PT)</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <LinearGradient colors={["#6ee7b7", "#10b981"]} style={styles.addButton}>
                <TouchableOpacity onPress={generateThemes} style={styles.addButtonTouchable} disabled={isGeneratingThemes} testID="generateThemesButton">
                  {isGeneratingThemes ? <Loader2 size={24} color="#FFFFFF" /> : <Wand2 size={24} color="#FFFFFF" />}
                </TouchableOpacity>
              </LinearGradient>
              <LinearGradient colors={["#00D4FF", "#0099CC"]} style={styles.addButton}>
                <TouchableOpacity onPress={handleGenerate} style={styles.addButtonTouchable} disabled={isGenerating} testID="generateButton">
                  {isGenerating ? <Loader2 size={24} color="#FFFFFF" /> : <Sparkles size={24} color="#FFFFFF" />}
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Discurso para conferência de imprensa"
                placeholderTextColor="#8E8E93"
                testID="titleInput"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Palavras‑chave (IA)</Text>
              <TextInput
                style={styles.input}
                value={keywords}
                onChangeText={setKeywords}
                placeholder="Use o botão Temas para gerar automaticamente"
                placeholderTextColor="#8E8E93"
                testID="keywordsInput"
              />
            </View>
            <View style={styles.inputRow}>
              <Text style={styles.label}>Público‑alvo</Text>
              <TextInput
                style={styles.input}
                value={audience}
                onChangeText={setAudience}
                placeholder="Ex: jornalistas, militantes, autarcas"
                placeholderTextColor="#8E8E93"
                testID="audienceInput"
              />
            </View>
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tom</Text>
                <TextInput
                  style={styles.input}
                  value={tone}
                  onChangeText={(t) => setTone((t as SpeechDraft["tone"]) ?? "institucional")}
                  placeholder="institucional | mobilizador | técnico | comício"
                  placeholderTextColor="#8E8E93"
                  testID="toneInput"
                />
              </View>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Duração (min)</Text>
                <TextInput
                  style={styles.input}
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  placeholder="7"
                  placeholderTextColor="#8E8E93"
                  testID="durationInput"
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {drafts.length === 0 ? (
          <View style={styles.emptyState} testID="emptySpeechState">
            <Megaphone size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Sem discursos gerados</Text>
            <Text style={styles.emptySubtitle}>Preencha os campos acima e toque em Gerar</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {[...drafts]
              .sort((a, b) => (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)).getTime() - (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).getTime())
              .map((d) => (
                <LinearGradient key={d.id} colors={["#0f3460", "#16213e"]} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Megaphone size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{d.title}</Text>
                      <Text style={styles.cardMeta}>{d.durationMinutes} min • {d.tone}</Text>
                      <Text style={styles.cardKeywords}>{d.keywords.join(', ')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteDraft(d.id)} style={styles.deleteBtn} testID={`delete-${d.id}`}>
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Esboço</Text>
                    {(Array.isArray(d.outline) ? d.outline : []).map((o, i) => (
                      <Text key={`${d.id}-o-${i}`} style={styles.listItem}>• {o}</Text>
                    ))}
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Discurso</Text>
                    <Text style={styles.speechText}>{d.speech}</Text>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleExport(d)} testID={`export-${d.id}`}>
                      <Plus size={18} color="#00D4FF" />
                      <Text style={styles.actionText}>Exportar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(d.speech, d.id)} testID={`copy-${d.id}`}>
                      {copiedId === d.id ? <Check size={18} color="#34C759" /> : <Copy size={18} color="#00D4FF" />}
                      <Text style={styles.actionText}>{copiedId === d.id ? 'Copiado' : 'Copiar'}</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function WrappedSpeechAIScreen() {
  return (
    <SpeechContext>
      <SpeechAIScreen />
    </SpeechContext>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  headerWrapper: { backgroundColor: "#1a1a2e" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: "#00D4FF", fontWeight: "500" as const },
  addButton: { borderRadius: 24, shadowColor: "#00D4FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  addButtonTouchable: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1, backgroundColor: "#0f0f23" },
  form: { padding: 16, gap: 12 },
  inputRow: { gap: 8 },
  label: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" as const },
  input: { backgroundColor: "#F5F5F7", borderRadius: 12, padding: 14, fontSize: 16, color: "#000000", borderWidth: 1, borderColor: "#E5E5EA" },
  row2: { flexDirection: "row", gap: 12 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "600" as const, color: "#FFFFFF", marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: "#8E8E93", textAlign: "center" },
  listContainer: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#00D4FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#00D4FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardTitle: { fontSize: 18, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 2 },
  cardMeta: { fontSize: 12, color: "#00D4FF", marginBottom: 6 },
  cardKeywords: { fontSize: 12, color: "#B0B0B0" },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 6 },
  listItem: { fontSize: 14, color: "#FFFFFF", lineHeight: 22, marginBottom: 2 },
  speechText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 212, 255, 0.2)", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  actionText: { fontSize: 14, fontWeight: "600" as const, color: "#00D4FF" },
  deleteBtn: { padding: 4 },
});
