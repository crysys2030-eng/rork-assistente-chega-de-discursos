import { generateObject } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  TrendingUp,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3,
} from "lucide-react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { z } from "zod";

interface SentimentAnalysis {
  id: string;
  topic: string;
  analysis: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  keyPoints: string[];
  recommendations: string[];
  sources: string[];
  createdAt: Date;
}

const [AnalysisContext, useAnalysis] = createContextHook(() => {
  const [analyses, setAnalyses] = useState<SentimentAnalysis[]>([]);
  const queryClient = useQueryClient();

  const analysesQuery = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("analyses");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((a: any) => ({
        ...a,
        createdAt: new Date(a.createdAt),
      }));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (analyses: SentimentAnalysis[]) => {
      await AsyncStorage.setItem("analyses", JSON.stringify(analyses));
      return analyses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    },
  });

  const { mutate: syncAnalyses } = syncMutation;

  useEffect(() => {
    if (analysesQuery.data) {
      setAnalyses(analysesQuery.data);
    }
  }, [analysesQuery.data]);

  const addAnalysis = useCallback(
    (analysis: SentimentAnalysis) => {
      const updated = [...analyses, analysis];
      setAnalyses(updated);
      syncAnalyses(updated);
    },
    [analyses, syncAnalyses]
  );

  const removeAnalysis = useCallback(
    (id: string) => {
      const updated = analyses.filter((a) => a.id !== id);
      setAnalyses(updated);
      syncAnalyses(updated);
    },
    [analyses, syncAnalyses]
  );

  return useMemo(
    () => ({
      analyses,
      addAnalysis,
      removeAnalysis,
      isLoading: analysesQuery.isLoading,
    }),
    [analyses, addAnalysis, removeAnalysis, analysesQuery.isLoading]
  );
});

function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { analyses, addAnalysis, removeAnalysis } = useAnalysis();
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const confirmAsync = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      if (Platform.OS === "web") {
        const ok = globalThis.confirm
          ? globalThis.confirm(`${title}\n\n${message}`)
          : true;
        resolve(ok);
        return;
      }
      Alert.alert(title, message, [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: "Eliminar", style: "destructive", onPress: () => resolve(true) },
      ]);
    });
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      Alert.alert("Erro", "Por favor, insira um tema para analisar.");
      return;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        analysis: z
          .string()
          .describe("Análise detalhada do sentimento público sobre o tema"),
        sentiment: z
          .enum(["positive", "negative", "neutral"])
          .describe("Sentimento geral: positive, negative ou neutral"),
        score: z
          .number()
          .min(-100)
          .max(100)
          .describe("Pontuação de -100 (muito negativo) a 100 (muito positivo)"),
        keyPoints: z
          .array(z.string())
          .describe("5-7 pontos-chave da opinião pública"),
        recommendations: z
          .array(z.string())
          .describe("5-7 recomendações estratégicas para o candidato"),
        sources: z
          .array(z.string())
          .describe("Principais fontes ou canais de opinião considerados"),
      });

      const prompt = `Analisa a opinião pública portuguesa sobre o seguinte tema político:

Tema: ${topic}
${context ? `Contexto adicional: ${context}` : ""}

Faz uma análise completa considerando:
1. Sentimento geral da população portuguesa
2. Principais preocupações e opiniões
3. Grupos demográficos com opiniões diferentes
4. Tendências recentes de opinião
5. Impacto mediático do tema
6. Recomendações estratégicas para um candidato político

A análise deve ser:
- Baseada no conhecimento do contexto político português
- Objetiva e imparcial
- Focada em dados e tendências
- Com recomendações práticas e acionáveis
- Linguagem clara em Português de Portugal`;

      const result = await generateObject({
        messages: [{ role: "user", content: prompt }],
        schema,
      });

      const newAnalysis: SentimentAnalysis = {
        id: Date.now().toString(),
        topic: topic.trim(),
        analysis: result.analysis,
        sentiment: result.sentiment,
        score: result.score,
        keyPoints: result.keyPoints,
        recommendations: result.recommendations,
        sources: result.sources,
        createdAt: new Date(),
      };

      addAnalysis(newAnalysis);
      setTopic("");
      setContext("");
      setShowModal(false);
      Alert.alert("Sucesso", "Análise gerada com sucesso!");
    } catch (error) {
      console.error("Error generating analysis:", error);
      Alert.alert("Erro", "Não foi possível gerar a análise. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAsync(
      "Confirmar",
      "Deseja eliminar esta análise?"
    );
    if (ok) removeAnalysis(id);
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp size={20} color="#34C759" />;
      case "negative":
        return <ThumbsDown size={20} color="#FF3B30" />;
      default:
        return <Minus size={20} color="#FF9500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "#34C759";
      case "negative":
        return "#FF3B30";
      default:
        return "#FF9500";
    }
  };

  const getSentimentText = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "POSITIVO";
      case "negative":
        return "NEGATIVO";
      default:
        return "NEUTRO";
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📊 Análise Pública</Text>
              <Text style={styles.headerSubtitle}>
                Opinião pública com IA
              </Text>
            </View>
            <LinearGradient
              colors={["#34C759", "#28A745"]}
              style={styles.addButton}
            >
              <TouchableOpacity
                onPress={() => setShowModal(true)}
                style={styles.addButtonTouchable}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={styles.scrollView}>
        {analyses.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nenhuma análise criada</Text>
            <Text style={styles.emptySubtitle}>
              Analise a opinião pública sobre temas políticos importantes
            </Text>
          </View>
        ) : (
          <View style={styles.analysesList}>
            {[...analyses]
              .sort((a, b) => {
                try {
                  const dateA =
                    a.createdAt instanceof Date
                      ? a.createdAt
                      : new Date(a.createdAt);
                  const dateB =
                    b.createdAt instanceof Date
                      ? b.createdAt
                      : new Date(b.createdAt);
                  return dateB.getTime() - dateA.getTime();
                } catch {
                  return 0;
                }
              })
              .map((analysis) => (
                <LinearGradient
                  key={analysis.id}
                  colors={["#0f3460", "#16213e"]}
                  style={styles.analysisCard}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedId(
                        expandedId === analysis.id ? null : analysis.id
                      )
                    }
                  >
                    <View style={styles.analysisHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <BarChart3 size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.headerText}>
                          <Text style={styles.analysisTopic}>
                            {analysis.topic}
                          </Text>
                          <View style={styles.sentimentRow}>
                            {getSentimentIcon(analysis.sentiment)}
                            <Text
                              style={[
                                styles.sentimentText,
                                {
                                  color: getSentimentColor(analysis.sentiment),
                                },
                              ]}
                            >
                              {getSentimentText(analysis.sentiment)}
                            </Text>
                            <View style={styles.scoreBadge}>
                              <Text style={styles.scoreText}>
                                {analysis.score > 0 ? "+" : ""}
                                {analysis.score}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {expandedId === analysis.id && (
                    <View style={styles.analysisDetails}>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📈 Análise</Text>
                        <Text style={styles.analysisText}>
                          {analysis.analysis}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          🔑 Pontos-Chave
                        </Text>
                        {(analysis.keyPoints || []).map((point, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{point}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          💡 Recomendações
                        </Text>
                        {(analysis.recommendations || []).map((rec, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{rec}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📢 Fontes</Text>
                        {(analysis.sources || []).map((source, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{source}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(analysis.id)}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>
                          Eliminar Análise
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </LinearGradient>
              ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Análise de Opinião</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formSection}>
                <Text style={styles.label}>Tema *</Text>
                <TextInput
                  style={styles.input}
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Ex: Reforma do SNS, Imigração, Habitação"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Contexto (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={context}
                  onChangeText={setContext}
                  placeholder="Adicione contexto adicional para uma análise mais precisa..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                />
              </View>

              <LinearGradient
                colors={
                  isGenerating
                    ? ["#C7C7CC", "#8E8E93"]
                    : ["#34C759", "#28A745"]
                }
                style={styles.generateButton}
              >
                <TouchableOpacity
                  style={styles.generateButtonInner}
                  onPress={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>
                        A analisar...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>
                        Analisar com IA
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </LinearGradient>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function WrappedAnalysisScreen() {
  return (
    <AnalysisContext>
      <AnalysisScreen />
    </AnalysisContext>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  headerWrapper: {
    backgroundColor: "#1a1a2e",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#34C759",
    fontWeight: "500" as const,
  },
  addButton: {
    borderRadius: 24,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonTouchable: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  analysesList: {
    padding: 16,
    gap: 12,
  },
  analysisCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  analysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "row",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#34C759",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  analysisTopic: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  sentimentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sentimentText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  scoreBadge: {
    backgroundColor: "rgba(52, 199, 89, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#34C759",
  },
  analysisDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(52, 199, 89, 0.2)",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bullet: {
    fontSize: 14,
    color: "#34C759",
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#000000",
  },
  modalClose: {
    fontSize: 28,
    color: "#8E8E93",
    fontWeight: "300" as const,
  },
  modalForm: {
    padding: 20,
    maxHeight: 600,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  generateButton: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#34C759",
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
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700" as const,
  },
});
