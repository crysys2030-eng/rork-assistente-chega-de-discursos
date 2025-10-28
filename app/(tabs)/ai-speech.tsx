import { generateObject, isLocalAI } from "@/lib/ai-bridge";
import { Stack } from "expo-router";
import { Sparkles, Loader2, Copy, Check, Mic, FileText, Shield } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { z } from "zod";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Form {
  tema: string;
  palavrasChave: string;
  publico: string;
  tom: "profissional" | "inspirador" | "institucional";
  minutos: string;
  conformidadePT: boolean;
}

export default function AISpeechScreen() {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<Form>({
    tema: "",
    palavrasChave: "",
    publico: "Cidadãos portugueses",
    tom: "profissional",
    minutos: "5",
    conformidadePT: true,
  });
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const canGenerate = useMemo(() => form.tema.trim().length > 2, [form.tema]);

  const splitKws = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);

  const localFallback = (): string => {
    const kws = splitKws(form.palavrasChave);
    const intro = `Senhoras e Senhores, hoje falo sobre ${form.tema}.`;
    const body = `Este discurso tem um tom ${form.tom} e dirige-se a ${form.publico}.`;
    const list = kws.length ? `\n\nPalavras‑chave: ${kws.map((k) => `#${k}`).join("  ")}` : "";
    return `${intro}\n\n${body}${list}\n\nPortugal merece verdade, transparência e ação.`;
  };

  const onGenerate = async () => {
    if (!canGenerate) {
      Alert.alert("Erro", "Indique um tema para o discurso.");
      return;
    }
    setLoading(true);
    try {
      const schema = z.object({
        speech: z.string().describe("Texto do discurso completo, contínuo, pronto a ler"),
      });

      const compliance = form.conformidadePT
        ? `\nRegras obrigatórias (Portugal): cumprir Lei da Imprensa, Estatuto do Jornalista, Código Deontológico e RGPD; distinguir factos de opinião; evitar calúnia e linguagem discriminatória; citar fontes verificáveis para factos.`
        : "";

      const prompt = `Gera um discurso para comunicação social, em português de Portugal.\nTema: ${form.tema}\nTom: ${form.tom}\nDuração: ${form.minutos} minutos\nAudiência: ${form.publico}\nPalavras‑chave: ${form.palavrasChave || "escolhe 5–8 relevantes"}${compliance}\nEstilo: introdução forte, 3–6 pontos principais, conclusão mobilizadora. Texto corrido sem títulos.`;

      if (isLocalAI) {
        setTexto(localFallback());
        return;
      }

      const res = await generateObject({ messages: [{ role: "user", content: prompt }], schema });
      setTexto(res.speech);
    } catch (e) {
      console.error("ai-speech generate error", e);
      Alert.alert("Erro", (e as Error)?.message?.includes("AI generation is unavailable")
        ? "A IA não está disponível neste deploy. Clique em Backend no topo para ativar."
        : "Não foi possível gerar o discurso.");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerIcon}><Mic size={18} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Gerador de Discursos (IA)</Text>
            <Text style={styles.headerSubtitle}>Área dedicada a criar discursos a partir de palavras‑chave</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.label}>Tema *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Corrupção e transparência no Estado"
                placeholderTextColor="#8E8E93"
                value={form.tema}
                onChangeText={(v) => setForm({ ...form, tema: v })}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.section, styles.col]}>
                <Text style={styles.label}>Tom</Text>
                <View style={styles.pillsRow}>
                  {["profissional", "inspirador", "institucional"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pill, form.tom === t && styles.pillActive]}
                      onPress={() => setForm({ ...form, tom: t as Form["tom"] })}
                    >
                      <Text style={[styles.pillText, form.tom === t && styles.pillTextActive]}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.section, styles.colSmall]}>
                <Text style={styles.label}>Minutos</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={form.minutos}
                  onChangeText={(v) => setForm({ ...form, minutos: v })}
                  placeholder="5"
                  placeholderTextColor="#8E8E93"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Audiência</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Jornalistas, militantes, público em geral"
                placeholderTextColor="#8E8E93"
                value={form.publico}
                onChangeText={(v) => setForm({ ...form, publico: v })}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Palavras‑chave (separadas por vírgulas)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: soberania, justiça, segurança, economia"
                placeholderTextColor="#8E8E93"
                value={form.palavrasChave}
                onChangeText={(v) => setForm({ ...form, palavrasChave: v })}
                multiline
                testID="kws"
              />
            </View>

            <View style={styles.complianceCard}>
              <View style={styles.complianceHeader}>
                <Shield size={16} color="#34C759" />
                <Text style={styles.complianceTitle}>Conformidade Comunicação Social (PT)</Text>
              </View>
              <Text style={styles.complianceDesc}>Garante regras legais e deontológicas portuguesas para uso mediático.</Text>
              <TouchableOpacity
                onPress={() => setForm({ ...form, conformidadePT: !form.conformidadePT })}
                style={[styles.toggle, form.conformidadePT ? styles.toggleOn : styles.toggleOff]}
                testID="toggle-pt"
              >
                <Text style={styles.toggleText}>{form.conformidadePT ? "Ativo" : "Inativo"}</Text>
              </TouchableOpacity>
            </View>

            <LinearGradient colors={loading ? ["#C7C7CC", "#8E8E93"] : ["#00D4FF", "#0099CC"]} style={styles.generateBtn}>
              <TouchableOpacity
                style={styles.generateBtnInner}
                onPress={onGenerate}
                disabled={!canGenerate || loading}
                testID="generate"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} color="#FFFFFF" />
                    <Text style={styles.generateText}>A gerar...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={styles.generateText}>Gerar Discurso</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>

            {texto ? (
              <View style={styles.result}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultTitleWrap}>
                    <FileText size={18} color="#FFFFFF" />
                    <Text style={styles.resultTitle}>Discurso</Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtn} onPress={onCopy}>
                    {copied ? <Check size={18} color="#34C759" /> : <Copy size={18} color="#00D4FF" />}
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.resultBox}>
                  <Text style={styles.resultText}>{texto}</Text>
                </ScrollView>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  header: { paddingVertical: 18, paddingHorizontal: 16 },
  headerInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#00D4FF", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" as const },
  headerSubtitle: { color: "#00D4FF", fontSize: 12 },
  scroll: { flex: 1 },
  form: { padding: 16, gap: 16 },
  section: { gap: 8 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" as const },
  input: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, fontSize: 16, color: "#000000", borderWidth: 1, borderColor: "#E5E5EA" },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  colSmall: { width: 120 },
  pillsRow: { flexDirection: "row", gap: 8 },
  pill: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E5EA" },
  pillActive: { backgroundColor: "#00A3C4", borderColor: "#00A3C4" },
  pillText: { color: "#000000", fontWeight: "600" as const },
  pillTextActive: { color: "#FFFFFF" },
  complianceCard: { backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  complianceHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  complianceTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" as const },
  complianceDesc: { color: "#94a3b8", fontSize: 12 },
  toggle: { alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  toggleOn: { backgroundColor: "#064e3b", borderColor: "#10b981" },
  toggleOff: { backgroundColor: "#3f3f46", borderColor: "#71717a" },
  toggleText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" as const },
  generateBtn: { borderRadius: 14, shadowColor: "#00D4FF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  generateBtnInner: { paddingVertical: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  generateText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" as const },
  result: { marginTop: 8, gap: 10 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultTitleWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" as const },
  copyBtn: { padding: 6 },
  resultBox: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, maxHeight: 420, borderWidth: 1, borderColor: "#E5E5EA" },
  resultText: { fontSize: 16, color: "#000000", lineHeight: 24 },
});
