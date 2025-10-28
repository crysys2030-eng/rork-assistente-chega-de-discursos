import { generateObject, isLocalAI } from "@/lib/ai-bridge";
import { Stack } from "expo-router";
import { Sparkles, Loader2, Copy, Check, ExternalLink, Trash2, Shield } from "lucide-react-native";
import React, { useState } from "react";
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
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import { LinearGradient } from "expo-linear-gradient";

interface SpeechFormData {
  topic: string;
  tone: "formal" | "informal" | "inspiracional" | "radical";
  duration: string;
  audience: string;
  keywords: string;
}

export default function SpeechScreen() {
  const [formData, setFormData] = useState<SpeechFormData>({
    topic: "",
    tone: "radical",
    duration: "5",
    audience: "",
    keywords: "",
  });

  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string; relevance: string }[]>([]);
  const [extractedKeywords, setExtractedKeywords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);

  const splitKeywords = (raw: string): string[] => {
    return raw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .map((k) => k.replace(/[#]/g, ""))
      .slice(0, 12);
  };

  const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const ensureKeywordsInText = (text: string, kws: string[]): string => {
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const missing = kws.filter((kw) => !new RegExp(`\\b${escape(kw)}\\b`, "i").test(text));
    if (missing.length === 0) return text;
    const extra = `\n\nPalavras-chave: ${missing.map((k) => `#${k}`).join("  ")}`;
    return text + extra;
  };

  const buildLocalSpeech = (data: SpeechFormData): { speech: string; sources: { title: string; url: string; relevance: string }[]; extractedKeywords: string[] } => {
    const kws = data.keywords.trim() ? splitKeywords(data.keywords) : [];
    const toneMap: Record<SpeechFormData["tone"], { opener: string; style: string }> = {
      radical: { opener: "Portugueses e Portuguesas, chega!", style: "tom assertivo, direto e combativo" },
      formal: { opener: "Minhas senhoras e meus senhores,", style: "tom institucional, claro e objetivo" },
      inspiracional: { opener: "Portugueses e Portuguesas,", style: "tom motivador, mobilizador e positivo" },
      informal: { opener: "Amigos e amigas,", style: "tom próximo, simples e franco" },
    };
    const toneCfg = toneMap[data.tone] ?? toneMap.radical;

    const minutes = parseInt(data.duration || "5", 10);
    const blocks = Math.max(3, Math.min(8, Math.round(minutes)));

    const segments: string[] = [];
    segments.push(`${toneCfg.opener}`);

    const introKw = kws[0] ? ` ${kws[0]}` : "";
    segments.push(
      `Hoje falamos de ${data.topic.trim()}.${introKw ? " " + toTitle(introKw) + "." : ""} Em ${toneCfg.style}, reforçamos a soberania nacional, a identidade portuguesa e o combate sem tréguas à corrupção.`
    );

    const agenda = [
      "soberania e fronteiras", "fim de privilégios e corrupção", "segurança e autoridade do Estado",
      "defesa da família e mérito", "economia que premia o trabalho"
    ];

    for (let i = 0; i < blocks - 2; i++) {
      const base = agenda[i % agenda.length];
      const kw = kws[i + 1] ? ` ${kws[i + 1]}` : "";
      segments.push(
        `Sobre ${base}:${kw ? " " + toTitle(kw) + "." : ""} Exigimos regras claras, transparência e justiça. Portugal deve voltar a premiar quem cumpre e a responsabilizar quem abusa do Estado.`
      );
    }

    segments.push(
      `Concluo com um apelo: juntos, com coragem e verdade, faremos um Portugal mais justo, seguro e livre. ${data.audience ? toTitle(data.audience) + ", " : ""}contamos convosco.`
    );

    let speech = segments.join("\n\n");
    if (kws.length > 0) speech = ensureKeywordsInText(speech, kws);

    const sources = [
      { title: "Público", url: "https://www.publico.pt/", relevance: "Referência para factos e reportagens nacionais" },
      { title: "Expresso", url: "https://expresso.pt/", relevance: "Análises e investigações relevantes" },
      { title: "Portal do Governo", url: "https://www.portugal.gov.pt/", relevance: "Documentos oficiais e indicadores" },
    ];

    return { speech, sources, extractedKeywords: kws };
  };

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      Alert.alert("Erro", "Por favor, insira o tema do discurso.");
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    try {
      const schema = z.object({
        speech: z.string().describe("O texto completo do discurso político"),
        sources: z.array(
          z.object({
            title: z.string().describe("Título ou descrição da fonte"),
            url: z.string().describe("URL real e verificável da fonte"),
            relevance: z.string().describe("Como esta fonte comprova os pontos do discurso")
          })
        ).describe("Lista de fontes reais e verificáveis que comprovam os factos mencionados"),
        extractedKeywords: z.array(z.string()).describe("Palavras‑chave realmente usadas no discurso")
      });

      const prompt = `Crie um discurso político em português alinhado com as ideias e valores do partido Chega com as seguintes características:
      
Tema: ${formData.topic}
Tom: ${formData.tone}
Duração estimada: ${formData.duration} minutos
Audiência: ${formData.audience || "Cidadãos portugueses"}
Palavras‑chave para incluir naturalmente: ${formData.keywords.trim() ? formData.keywords : "escolhe 5–8 palavras‑chave relevantes"}

O discurso deve refletir as posições do Chega:
- Defesa da soberania nacional e identidade portuguesa
- Combate à corrupção e privilégios
- Reforço da segurança e autoridade do Estado
- Defesa da família tradicional e valores conservadores
- Crítica ao sistema político estabelecido
- Patriotismo e orgulho nacional
- Justiça social com responsabilidade individual

O discurso deve:
- Ter uma introdução forte e impactante
- Desenvolver os pontos principais com convicção
- Incluir referências aos valores portugueses e à história de Portugal
- Apelar ao sentimento patriótico
- Ter uma conclusão mobilizadora
- Ser direto, claro e sem rodeios políticos
- Refletir o tom ${formData.tone === "radical" ? "mais incisivo e combativo" : formData.tone}
- Focar sempre em Portugal, Europa e o Mundo
- Quando mencionar situações em que Portugal foi prejudicado, usar factos verificáveis
- Usar e entrelaçar de forma natural as palavras‑chave listadas (ou sugeridas pelo modelo)

IMPORTANTE: Fornece SEMPRE fontes reais e verificáveis para os factos mencionados:
- URLs reais de fontes credíveis (jornais portugueses, sites governamentais, organizações internacionais)
- Cada facto importante deve ter uma fonte associada
- Quando mencionar que Portugal foi prejudicado, fornecer provas concretas com fontes
- Priorizar fontes portuguesas quando disponíveis (ex: Público, Expresso, Observador, sites .gov.pt)
- Incluir também fontes europeias e internacionais quando relevante

Não inclua títulos ou metadados no discurso, apenas o texto pronto a ser lido.`;

      if (isLocalAI) {
        const local = buildLocalSpeech(formData);
        setGeneratedSpeech(local.speech);
        setSources(local.sources);
        setExtractedKeywords(local.extractedKeywords);
        setShowSpeech(true);
        return;
      }

      const result = await generateObject({
        messages: [{ role: "user", content: prompt }],
        schema
      });

      setGeneratedSpeech(result.speech);
      setSources(result.sources);
      setExtractedKeywords((result as any).extractedKeywords ?? splitKeywords(formData.keywords));
      setShowSpeech(true);
    } catch (error) {
      console.error("Error generating speech:", error);
      const message = (error as Error)?.message ?? "Erro desconhecido";
      if (message.includes("AI generation is unavailable")) {
        setAiError("A IA não está disponível neste deploy. Ative o Backend no topo para usar as funcionalidades de IA.");
      }
      Alert.alert("Erro", (error as Error)?.message?.includes("AI generation is unavailable")
        ? "A IA não está disponível neste deploy. Clique em Backend no topo para ativar."
        : "Não foi possível gerar o discurso. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedSpeech);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmAsync = React.useCallback((title: string, message: string) => {
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

  const handleDeleteSpeech = async () => {
    const ok = await confirmAsync('Eliminar Discurso', 'Deseja eliminar o discurso gerado?');
    if (ok) {
      setGeneratedSpeech("");
      setSources([]);
      setExtractedKeywords([]);
      setShowSpeech(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <Text style={styles.headerTitle}>🎯 Preparação de Discursos</Text>
        <Text style={styles.headerSubtitle}>IA alinhada com o Chega</Text>
        {aiError ? (
          <View style={styles.aiBanner} testID="ai-unavailable-banner">
            <Shield size={16} color="#FF453A" />
            <Text style={styles.aiBannerText}>A IA não está disponível neste deploy. Ative Backend no topo para usar IA.</Text>
          </View>
        ) : null}
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={styles.label}>Tema do Discurso *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.topic}
                onChangeText={(text) =>
                  setFormData({ ...formData, topic: text })
                }
                placeholder="Ex: Combate à corrupção e defesa da soberania"
                placeholderTextColor="#8E8E93"
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Tom do Discurso</Text>
              <View style={styles.toneButtons}>
                {(["radical", "formal", "inspiracional"] as const).map(
                  (tone) => (
                    <TouchableOpacity
                      key={tone}
                      style={[
                        styles.toneButton,
                        formData.tone === tone && styles.toneButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, tone })}
                    >
                      <Text
                        style={[
                          styles.toneButtonText,
                          formData.tone === tone &&
                            styles.toneButtonTextActive,
                        ]}
                      >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Duração (minutos)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.duration}
                onChangeText={(text) =>
                  setFormData({ ...formData, duration: text })
                }
                placeholder="5"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Audiência (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.audience}
                onChangeText={(text) =>
                  setFormData({ ...formData, audience: text })
                }
                placeholder="Ex: Militantes, cidadãos, assembleia"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Palavras‑chave (separadas por vírgulas)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.keywords}
                onChangeText={(text) => setFormData({ ...formData, keywords: text })}
                placeholder="Ex: soberania, corrupção, segurança, família, justiça"
                placeholderTextColor="#8E8E93"
                multiline
                testID="keywords-input"
              />
            </View>

            <LinearGradient
              colors={isGenerating ? ["#C7C7CC", "#8E8E93"] : ["#00D4FF", "#0099CC"]}
              style={styles.generateButton}
            >
              <TouchableOpacity
                style={[styles.generateButtonInner]}
                onPress={handleGenerate}
                disabled={isGenerating}
                testID="generate-speech"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>A gerar...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} color="#FFFFFF" />
                    <Text style={styles.generateButtonText}>{aiError ? "IA indisponível" : "Gerar Discurso"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>

            {(generatedSpeech ? true : false) && generatedSpeech ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Discurso Gerado</Text>
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopy}
                    >
                      {copied ? (
                        <Check size={20} color="#34C759" />
                      ) : (
                        <Copy size={20} color="#00D4FF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDeleteSpeech}
                    >
                      <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>

                {extractedKeywords.length > 0 && (
                  <View style={styles.keywordsContainer} testID="extracted-keywords">
                    {extractedKeywords.map((kw, i) => (
                      <View key={`${kw}-${i}`} style={styles.keywordChip}>
                        <Text style={styles.keywordText}>#{kw}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <ScrollView style={styles.speechContainer}>
                  <Text style={styles.speechText}>{generatedSpeech}</Text>
                </ScrollView>
                
                {sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={styles.sourcesTitle}>📚 Fontes e Provas</Text>
                    <Text style={styles.sourcesSubtitle}>
                      Fontes verificáveis que comprovam os factos mencionados
                    </Text>
                    {sources.map((source, index) => (
                      <LinearGradient
                        key={index}
                        colors={["#0f3460", "#16213e"]}
                        style={styles.sourceCard}
                      >
                        <TouchableOpacity
                          style={styles.sourceCardInner}
                          onPress={() => {
                            Linking.openURL(source.url).catch(() => {
                              Alert.alert("Erro", "Não foi possível abrir o link.");
                            });
                          }}
                        >
                        <View style={styles.sourceHeader}>
                          <Text style={styles.sourceNumber}>{index + 1}</Text>
                          <View style={styles.sourceContent}>
                            <Text style={styles.sourceTitle}>{source.title}</Text>
                            <Text style={styles.sourceRelevance}>
                              {source.relevance}
                            </Text>
                            <View style={styles.sourceUrlContainer}>
                              <Text style={styles.sourceUrl} numberOfLines={1}>
                                {source.url}
                              </Text>
                              <ExternalLink size={14} color="#E94E1B" />
                            </View>
                          </View>
                        </View>
                        </TouchableOpacity>
                      </LinearGradient>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingBottom: 20,
  },
  safeArea: {
    paddingHorizontal: 20,
  },
  aiBanner: {
    marginTop: 10,
    backgroundColor: "#3b0b0e",
    borderColor: "#FF453A",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiBannerText: {
    color: "#FFB3AE",
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#00D4FF",
    fontWeight: "500" as const,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  formContainer: {
    padding: 16,
    gap: 20,
  },
  formSection: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    minHeight: 50,
  },
  toneButtons: {
    flexDirection: "row",
    gap: 8,
  },
  toneButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  toneButtonActive: {
    backgroundColor: "#E94E1B",
    borderColor: "#E94E1B",
  },
  toneButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
  },
  toneButtonTextActive: {
    color: "#FFFFFF",
  },
  generateButton: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  generateButtonInner: {
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  generateButtonInnerDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  resultContainer: {
    marginTop: 8,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  resultActions: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  speechContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  speechText: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 24,
  },
  sourcesContainer: {
    marginTop: 20,
    gap: 12,
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  keywordChip: {
    backgroundColor: "#16213e",
    borderColor: "#0f3460",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  keywordText: {
    color: "#00D4FF",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  sourcesTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  sourcesSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  sourceCard: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sourceCardInner: {
    padding: 16,
  },
  sourceHeader: {
    flexDirection: "row",
    gap: 12,
  },
  sourceNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E94E1B",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center",
    lineHeight: 28,
  },
  sourceContent: {
    flex: 1,
    gap: 6,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  sourceRelevance: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  sourceUrlContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  sourceUrl: {
    flex: 1,
    fontSize: 13,
    color: "#00D4FF",
    fontWeight: "500" as const,
  },
});