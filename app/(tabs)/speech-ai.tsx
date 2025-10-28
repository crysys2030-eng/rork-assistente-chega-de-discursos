import { generateText } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Copy, Loader2, Megaphone, Plus, Sparkles, Trash2 } from "lucide-react-native";
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
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
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



  const handleGenerate = async () => {
    const brief = title.trim();
    if (!brief) {
      Alert.alert("Indicação em falta", "Escreva um tema ou frase base para gerar o texto.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Gera apenas o TEXTO completo de um discurso em português de Portugal sobre: "${brief}". Não incluas títulos, marcadores, secções, metadados nem notas — só o corpo do discurso, fluido, com 6–8 minutos de leitura. Cumpre as leis portuguesas (pluralismo, responsabilidade, rejeição de incitação ao ódio).`;
      const result = await generateText({ messages: [{ role: "user", content: prompt }] });
      const finalSpeech = typeof result === "string" ? result.trim() : "";

      if (finalSpeech.length === 0) {
        throw new Error("Conteúdo vazio");
      }

      const draft: SpeechDraft = {
        id: Date.now().toString(),
        title: brief,
        keywords: [],
        audience: "",
        tone: "institucional",
        durationMinutes: 0,
        outline: [],
        speech: finalSpeech,
        createdAt: new Date(),
      };
      addDraft(draft);
      setTitle("");
      Alert.alert("Sucesso", "Texto gerado com IA.");
    } catch (e) {
      console.error("speech-ai generate error", e);
      Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível gerar. Tente novamente.");
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
    const fileName = `texto_${d.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.txt`;
    const content = `${d.speech}`;

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
              <Text style={styles.headerTitle}>📣 Texto IA</Text>
              <Text style={styles.headerSubtitle}>Geração apenas de texto (PT‑PT)</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
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
              <Text style={styles.label}>Tema ou frase base</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Prioridades para o próximo orçamento do município"
                placeholderTextColor="#8E8E93"
                testID="titleInput"
              />
            </View>
          </View>
        </KeyboardAvoidingView>

        {drafts.length === 0 ? (
          <View style={styles.emptyState} testID="emptySpeechState">
            <Megaphone size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Sem textos gerados</Text>
            <Text style={styles.emptySubtitle}>Escreva um tema e toque em Gerar</Text>
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
                    </View>
                    <TouchableOpacity onPress={() => deleteDraft(d.id)} style={styles.deleteBtn} testID={`delete-${d.id}`}>
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Texto</Text>
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
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 6 },
  listItem: { fontSize: 14, color: "#FFFFFF", lineHeight: 22, marginBottom: 2 },
  speechText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0, 212, 255, 0.2)", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  actionText: { fontSize: 14, fontWeight: "600" as const, color: "#00D4FF" },
  deleteBtn: { padding: 4 },
});
