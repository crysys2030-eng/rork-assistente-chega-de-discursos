import { generateObject } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Megaphone, Loader2, Sparkles, Copy, Check, Trash2, RotateCw } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

interface Speech {
  id: string;
  title: string;
  keywords: string[];
  content: string;
  createdAt: Date;
}

const [SpeechContext, useSpeeches] = createContextHook(() => {
  const [speeches, setSpeeches] = useState<Speech[]>([]);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["speeches"],
    queryFn: async () => {
      try {
        const raw = await AsyncStorage.getItem("speeches");
        if (!raw) return [] as Speech[];
        const parsed = JSON.parse(raw) as any[];
        return parsed.map((s) => ({
          id: String(s?.id ?? Date.now()),
          title: String(s?.title ?? "Discurso"),
          keywords: Array.isArray(s?.keywords) ? s.keywords : [],
          content: String(s?.content ?? ""),
          createdAt: new Date(s?.createdAt ?? Date.now()),
        }));
      } catch (e) {
        console.log("Speech: load error", e);
        return [] as Speech[];
      }
    },
  });

  const sync = useMutation({
    mutationFn: async (list: Speech[]) => {
      await AsyncStorage.setItem("speeches", JSON.stringify(list));
      return list;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["speeches"] }),
  });
  const { mutate: syncSpeeches } = sync;

  useEffect(() => {
    if (q.data) setSpeeches(q.data);
  }, [q.data]);

  const addSpeech = useCallback((s: Speech) => {
    const updated = [s, ...speeches];
    setSpeeches(updated);
    syncSpeeches(updated);
  }, [speeches, syncSpeeches]);

  const removeSpeech = useCallback((id: string) => {
    const updated = speeches.filter((s) => s.id !== id);
    setSpeeches(updated);
    syncSpeeches(updated);
  }, [speeches, syncSpeeches]);

  return useMemo(() => ({ speeches, addSpeech, removeSpeech, isLoading: q.isLoading }), [speeches, addSpeech, removeSpeech, q.isLoading]);
});

function SpeechAIScreen() {
  const insets = useSafeAreaInsets();
  const { speeches, addSpeech, removeSpeech } = useSpeeches();

  const [keywordsInput, setKeywordsInput] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [tone, setTone] = useState<string>("");
  const [length, setLength] = useState<string>("");
  const [audience, setAudience] = useState<string>("");
  const [language, setLanguage] = useState<string>("pt-PT");

  const existingTitles = useMemo(() => speeches.map((s) => s.title).filter(Boolean), [speeches]);

  const confirmAsync = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      if (Platform.OS === 'web') {
        const ok = globalThis.confirm ? globalThis.confirm(`${title}\n\n${message}`) : true;
        resolve(ok);
        return;
      }
      Alert.alert(title, message, [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  }, []);

  const handleCopy = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    const rawKeywords = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (rawKeywords.length === 0) {
      Alert.alert("Erro", "Insira palavras‑chave separadas por vírgulas.");
      return;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        title: z.string().describe("Título forte e único do discurso"),
        content: z.string().describe("Discurso completo apenas em texto, pronto para leitura em palco")
      });

      const preferences = [
        tone ? `Tom preferido: ${tone}` : "Tom decidido pela IA",
        length ? `Extensão: ${length}` : "Extensão escolhida pela IA",
        audience ? `Audiência: ${audience}` : "Audiência definida pela IA",
        `Idioma: ${language}`,
      ].join("\n");

      const basePrompt = `Gera um discurso político 100% criado por IA.
${preferences}
- Usa estas palavras‑chave obrigatórias: ${rawKeywords.join(', ')}
- O tema, estrutura e ideias podem ser definidos pela IA.
- O título NÃO pode repetir nenhum existente: ${existingTitles.join(', ') || 'nenhum'}
- Devolve APENAS o título e o discurso em texto corrido, sem listas nem markdown.
- Estrutura: abertura impactante, 3–5 secções com narrativa coerente, conclusão mobilizadora.
- Evita conteúdos vazios e repetições. Sê específico e varia a linguagem.`;

      let attempt = 0;
      let result: { title: string; content: string } | null = null;

      while (attempt < 2) {
        const prompt = attempt === 0 ? basePrompt : `${basePrompt}\n- Reescreve com variação de ideias, metáforas novas e exemplos diferentes.`;
        const r = await generateObject({ messages: [{ role: "user", content: prompt }], schema });
        const contentOk = typeof r.content === 'string' && r.content.trim().length > 200;
        const duplicate = speeches.some((s) => s.content.trim() === r.content.trim());
        if (contentOk && !duplicate) {
          result = r;
          break;
        }
        attempt += 1;
      }

      if (!result) {
        throw new Error("Conteúdo vazio");
      }

      const speech: Speech = {
        id: Date.now().toString(),
        title: customTitle.trim() || result.title,
        keywords: rawKeywords,
        content: result.content,
        createdAt: new Date(),
      };

      addSpeech(speech);
      setKeywordsInput("");
      setCustomTitle("");
      Alert.alert("Sucesso", "Discurso gerado por IA!");
    } catch (e: any) {
      console.log("speech-ai generate error", e);
      Alert.alert("Erro", e?.message ? String(e.message) : "Falha ao gerar. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoGenerate = async () => {
    setIsGenerating(true);
    try {
      const schema = z.object({
        title: z.string(),
        keywords: z.array(z.string()),
        content: z.string(),
      });

      const prompt = `Cria um discurso político 100% IA, com escolhas ótimas de tom, extensão, estrutura e audiência.
- Não repitas títulos: ${existingTitles.join(', ') || 'nenhum'}
- Devolve apenas o título e o discurso em texto corrido.
- Garante conteúdo substantivo, concreto e sem repetições.`;

      const r = await generateObject({ messages: [{ role: "user", content: prompt }], schema });
      const contentOk = typeof r.content === 'string' && r.content.trim().length > 200;
      if (!contentOk) throw new Error("Conteúdo vazio");

      const speech: Speech = {
        id: Date.now().toString(),
        title: r.title,
        keywords: Array.isArray(r.keywords) ? r.keywords : [],
        content: r.content,
        createdAt: new Date(),
      };

      addSpeech(speech);
      Alert.alert("Sucesso", "Discurso automático gerado!");
    } catch (e: any) {
      console.log("speech-ai auto error", e);
      Alert.alert("Erro", "Não foi possível gerar automaticamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteSpeech = async (id: string) => {
    const ok = await confirmAsync('Eliminar', 'Deseja eliminar este discurso?');
    if (ok) removeSpeech(id);
  };

  return (
    <View style={styles.container} testID="speech-ai-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}
        testID="speech-ai-header">
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📣 Discurso IA</Text>
              <Text style={styles.headerSubtitle}>IA escolhe as melhores opções</Text>
            </View>
            <LinearGradient colors={["#E94E1B", "#D63E0F"]} style={styles.addButton}>
              <TouchableOpacity onPress={handleAutoGenerate} style={styles.addButtonTouchable} disabled={isGenerating}
                testID="speech-ai-auto-generate">
                {isGenerating ? (
                  <Loader2 size={24} color="#FFFFFF" />
                ) : (
                  <Sparkles size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.inputCard} testID="speech-ai-input-card">
          <Text style={styles.label}>Palavras‑chave</Text>
          <TextInput
            style={styles.input}
            value={keywordsInput}
            onChangeText={setKeywordsInput}
            placeholder="ex: economia, segurança, saúde, educação"
            placeholderTextColor="#8E8E93"
            testID="speech-ai-keywords-input"
          />
          <Text style={styles.hint}>Separe com vírgulas. A IA cria o resto.</Text>

          <Text style={[styles.label, { marginTop: 12 }]}>Título (opcional)</Text>
          <TextInput
            style={styles.input}
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder="Título personalizado"
            placeholderTextColor="#8E8E93"
            testID="speech-ai-title-input"
          />

          <View style={styles.prefsRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={tone}
              onChangeText={setTone}
              placeholder="Tom (ex: inspirador)"
              placeholderTextColor="#8E8E93"
              testID="speech-ai-tone-input"
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={length}
              onChangeText={setLength}
              placeholder="Extensão (curto/médio/longo)"
              placeholderTextColor="#8E8E93"
              testID="speech-ai-length-input"
            />
          </View>

          <View style={styles.prefsRow}>
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={audience}
              onChangeText={setAudience}
              placeholder="Audiência (ex: juventude)"
              placeholderTextColor="#8E8E93"
              testID="speech-ai-audience-input"
            />
            <TextInput
              style={[styles.input, styles.inputHalf]}
              value={language}
              onChangeText={setLanguage}
              placeholder="Idioma (ex: pt-PT)"
              placeholderTextColor="#8E8E93"
              testID="speech-ai-language-input"
            />
          </View>

          <LinearGradient colors={isGenerating ? ["#C7C7CC", "#8E8E93"] : ["#E94E1B", "#D63E0F"]} style={styles.generateButton}>
            <TouchableOpacity onPress={handleGenerate} style={styles.generateButtonInner} disabled={isGenerating} testID="speech-ai-generate">
              {isGenerating ? (
                <>
                  <Loader2 size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>A gerar…</Text>
                </>
              ) : (
                <>
                  <Megaphone size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Gerar Discurso</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={styles.listContainer}>
          {(speeches ?? []).length === 0 ? (
            <View style={styles.emptyState} testID="speech-ai-empty">
              <Megaphone size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>Sem discursos ainda</Text>
              <Text style={styles.emptySubtitle}>Escreva palavras‑chave ou use geração automática</Text>
            </View>
          ) : (
            <View>
              {(speeches ?? []).map((s) => (
                <LinearGradient key={s.id} colors={["#0f3460", "#16213e"]} style={styles.speechCard}>
                  <View style={styles.speechHeader}>
                    <View style={styles.speechIcon}><Megaphone size={20} color="#FFFFFF" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.speechTitle}>{s.title}</Text>
                      {s.keywords && s.keywords.length > 0 && (
                        <Text style={styles.keywordsText}>{s.keywords.join(" • ")}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => deleteSpeech(s.id)} style={styles.deleteBtn} testID={`speech-delete-${s.id}`}>
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.contentText}>{s.content}</Text>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCopy(`${s.title}\n\n${s.content}`, s.id)} testID={`speech-copy-${s.id}`}>
                      {copiedId === s.id ? <Check size={18} color="#34C759" /> : <Copy size={18} color="#00D4FF" />}
                      <Text style={styles.actionText}>{copiedId === s.id ? "Copiado" : "Copiar"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: "rgba(233, 78, 27, 0.2)" }]}
                      onPress={async () => {
                        setIsGenerating(true);
                        try {
                          const schema = z.object({ title: z.string(), content: z.string() });
                          const prompt = `Reescreve o seguinte discurso com variação e maior profundidade mantendo as palavras‑chave: ${s.keywords.join(', ')}. Devolve apenas o texto e um título.\n\nTEXTO:\n${s.content}`;
                          const r = await generateObject({ messages: [{ role: 'user', content: prompt }], schema });
                          const speech: Speech = { id: Date.now().toString(), title: r.title, keywords: s.keywords, content: r.content, createdAt: new Date() };
                          addSpeech(speech);
                        } catch (err) {
                          Alert.alert('Erro', 'Falha a regenerar.');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      testID={`speech-regenerate-${s.id}`}
                    >
                      <RotateCw size={18} color="#E94E1B" />
                      <Text style={[styles.actionText, { color: "#E94E1B" }]}>Regenerar</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showManualModal} animationType="slide" transparent onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Novo Discurso</Text>
                <TouchableOpacity onPress={() => setShowManualModal(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  headerSubtitle: { fontSize: 15, color: "#E94E1B", fontWeight: "500" as const },
  addButton: { borderRadius: 24, shadowColor: "#E94E1B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  addButtonTouchable: { width: 48, height: 48, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1, backgroundColor: "#0f0f23" },
  inputCard: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: "#111436", borderWidth: 1, borderColor: "rgba(233, 78, 27, 0.2)" },
  label: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" as const, marginBottom: 8 },
  input: { backgroundColor: "#F5F5F7", borderRadius: 12, padding: 14, fontSize: 16, color: "#000000", borderWidth: 1, borderColor: "#E5E5EA" },
  hint: { fontSize: 12, color: "#8E8E93", marginTop: 6 },
  generateButton: { borderRadius: 14, marginTop: 14 },
  generateButtonInner: { paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  generateButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" as const },
  listContainer: { padding: 16, gap: 12 },
  emptyState: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const, color: "#FFFFFF", marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#8E8E93", textAlign: "center" },
  speechCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#E94E1B", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  speechHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  speechIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E94E1B", justifyContent: "center", alignItems: "center", marginRight: 12 },
  speechTitle: { fontSize: 17, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 4 },
  keywordsText: { fontSize: 12, color: "#E94E1B" },
  contentText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0, 212, 255, 0.2)", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  actionText: { fontSize: 14, fontWeight: "600" as const, color: "#00D4FF" },
  deleteBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalKeyboard: { maxHeight: "90%" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E5E5EA" },
  modalTitle: { fontSize: 22, fontWeight: "700" as const, color: "#000000" },
  modalClose: { fontSize: 28, color: "#8E8E93", fontWeight: "300" as const },
  prefsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  inputHalf: { flex: 1 },
});
