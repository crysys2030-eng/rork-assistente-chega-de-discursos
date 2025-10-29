import { generateObject } from "@/lib/ai-bridge";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Globe2, Loader2, Newspaper, Sparkles } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

interface WikiItem { title: string; snippet: string; pageid: number }

async function fetchWiki(term: string): Promise<WikiItem[]> {
  if (!term.trim()) return [];
  const url = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao obter dados");
  const json = await res.json();
  const list = (json?.query?.search ?? []) as any[];
  return list.map((i) => ({ title: String(i?.title ?? ""), snippet: String(i?.snippet ?? ""), pageid: Number(i?.pageid ?? 0) }));
}

export default function AIFeedScreen() {
  const insets = useSafeAreaInsets();
  const [term, setTerm] = useState<string>("política Portugal atualidade");
  const [lastTerm, setLastTerm] = useState<string>(term);
  const [isSynth, setIsSynth] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>("");
  const [talkingPoints, setTalkingPoints] = useState<string[]>([]);

  const q = useQuery({
    queryKey: ["ai-feed", lastTerm],
    queryFn: () => fetchWiki(lastTerm),
  });

  const handleSearch = () => {
    setLastTerm(term.trim());
  };

  const handleSynthesize = async () => {
    if (!q.data || q.data.length === 0) {
      Alert.alert("Sem dados", "Pesquise primeiro por um tema válido.");
      return;
    }
    setIsSynth(true);
    try {
      const schema = z.object({
        resumo: z.string().describe("Síntese objetiva em PT de Portugal"),
        pontos: z.array(z.string()).describe("5-7 talking points acionáveis, curtos"),
      });
      const context = q.data
        .slice(0, 8)
        .map((i, idx) => `${idx + 1}. ${i.title} — ${i.snippet.replace(/<[^>]+>/g, " ")}`)
        .join("\n");

      const prompt = `A partir dos resultados de pesquisa da Wikipédia em PT, cria um resumo imparcial e pontos de discurso úteis para comunicação política.
Tema: ${lastTerm}
Fontes:
${context}
Requisitos:
- Linguagem clara, sem jargão
- 5 a 7 bullets com ação concreta
- Evitar repetição
- Português (Portugal)`;

      const r = await generateObject({ messages: [{ role: "user", content: prompt }], schema });
      setSummary(r.resumo);
      setTalkingPoints(r.pontos ?? []);
    } catch (e) {
      Alert.alert("Erro", "Falha a sintetizar com IA.");
    } finally {
      setIsSynth(false);
    }
  };

  const hasResults = useMemo(() => (q.data ?? []).length > 0, [q.data]);

  return (
    <View style={styles.container} testID="ai-feed-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}> 
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📰 AI Feed</Text>
              <Text style={styles.headerSubtitle}>Dados reais + síntese por IA</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Tema</Text>
          <TextInput
            style={styles.input}
            value={term}
            onChangeText={setTerm}
            placeholder="ex: orçamento de estado, eleições portuguesas"
            placeholderTextColor="#8E8E93"
            testID="ai-feed-term"
          />
          <View style={styles.row}>
            <LinearGradient colors={["#00D4FF", "#0099CC"]} style={[styles.button, { flex: 1 }]}> 
              <TouchableOpacity onPress={handleSearch} style={styles.buttonInner} testID="ai-feed-search">
                {q.isLoading ? <Loader2 size={18} color="#FFFFFF"/> : <Globe2 size={18} color="#FFFFFF"/>}
                <Text style={styles.buttonText}>{q.isLoading ? "A pesquisar…" : "Pesquisar"}</Text>
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ width: 12 }} />
            <LinearGradient colors={["#E94E1B", "#D63E0F"]} style={[styles.button, { flex: 1 }]}> 
              <TouchableOpacity onPress={handleSynthesize} style={styles.buttonInner} disabled={isSynth} testID="ai-feed-synthesize">
                {isSynth ? <Loader2 size={18} color="#FFFFFF"/> : <Sparkles size={18} color="#FFFFFF"/>}
                <Text style={styles.buttonText}>{isSynth ? "A sintetizar…" : "Sintetizar IA"}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.results}>
          {!hasResults && !q.isLoading ? (
            <View style={styles.empty} testID="ai-feed-empty">
              <Newspaper size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>Pesquise para ver resultados</Text>
              <Text style={styles.emptySubtitle}>Usamos a API pública da Wikipédia (dados reais)</Text>
            </View>
          ) : (
            <View>
              {(q.data ?? []).slice(0, 8).map((i) => (
                <View key={i.pageid} style={styles.item}>
                  <View style={styles.itemIcon}><Newspaper size={18} color="#FFFFFF"/></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{i.title}</Text>
                    <Text style={styles.itemSnippet}>{i.snippet.replace(/<[^>]+>/g, " ")}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {(summary || talkingPoints.length > 0) && (
          <View style={styles.card} testID="ai-feed-output">
            {summary ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.sectionTitle}>Resumo</Text>
                <Text style={styles.outputText}>{summary}</Text>
              </View>
            ) : null}
            {talkingPoints.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Pontos de Discurso</Text>
                {talkingPoints.map((p, idx) => (
                  <Text key={idx} style={styles.outputBullet}>• {p}</Text>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  headerWrapper: { backgroundColor: "#1a1a2e" },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 4 },
  headerSubtitle: { fontSize: 15, color: "#00D4FF", fontWeight: "500" as const },
  scroll: { flex: 1 },
  card: { margin: 16, padding: 16, borderRadius: 16, backgroundColor: "#111436", borderWidth: 1, borderColor: "rgba(0, 212, 255, 0.2)" },
  label: { fontSize: 14, color: "#FFFFFF", fontWeight: "600" as const, marginBottom: 8 },
  input: { backgroundColor: "#F5F5F7", borderRadius: 12, padding: 14, fontSize: 16, color: "#000000", borderWidth: 1, borderColor: "#E5E5EA" },
  row: { flexDirection: "row", marginTop: 12 },
  button: { borderRadius: 12 },
  buttonInner: { paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" as const },
  results: { paddingHorizontal: 16 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "600" as const, color: "#FFFFFF", marginTop: 12, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#8E8E93", textAlign: "center" },
  item: { flexDirection: "row", gap: 12, backgroundColor: "#0f1a3a", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "rgba(0, 212, 255, 0.12)" },
  itemIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#00D4FF", alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 15, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 4 },
  itemSnippet: { fontSize: 13, color: "#B0B0B0", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, color: "#FFFFFF", marginBottom: 8 },
  outputText: { fontSize: 14, color: "#FFFFFF", lineHeight: 22 },
  outputBullet: { fontSize: 14, color: "#FFFFFF", lineHeight: 22, marginBottom: 4 },
});
