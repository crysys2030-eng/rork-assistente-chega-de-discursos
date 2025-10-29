import { generateObject } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  MessageCircle,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Copy,
  Check,
  Zap,
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
import * as Clipboard from "expo-clipboard";
import { z } from "zod";

interface QuickResponse {
  id: string;
  question: string;
  response: string;
  tone: string;
  keyMessages: string[];
  alternatives: string[];
  warnings: string[];
  createdAt: Date;
}

const [ResponsesContext, useResponses] = createContextHook(() => {
  const [responses, setResponses] = useState<QuickResponse[]>([]);
  const queryClient = useQueryClient();

  const responsesQuery = useQuery({
    queryKey: ["responses"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("responses");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      }));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (responses: QuickResponse[]) => {
      await AsyncStorage.setItem("responses", JSON.stringify(responses));
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responses"] });
    },
  });

  const { mutate: syncResponses } = syncMutation;

  useEffect(() => {
    if (responsesQuery.data) {
      setResponses(responsesQuery.data);
    }
  }, [responsesQuery.data]);

  const addResponse = useCallback(
    (response: QuickResponse) => {
      const updated = [...responses, response];
      setResponses(updated);
      syncResponses(updated);
    },
    [responses, syncResponses]
  );

  const removeResponse = useCallback(
    (id: string) => {
      const updated = responses.filter((r) => r.id !== id);
      setResponses(updated);
      syncResponses(updated);
    },
    [responses, syncResponses]
  );

  return useMemo(
    () => ({
      responses,
      addResponse,
      removeResponse,
      isLoading: responsesQuery.isLoading,
    }),
    [responses, addResponse, removeResponse, responsesQuery.isLoading]
  );
});

function ResponsesScreen() {
  const insets = useSafeAreaInsets();
  const { responses, addResponse, removeResponse } = useResponses();
  const [showModal, setShowModal] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    if (!question.trim()) {
      Alert.alert("Erro", "Por favor, insira uma questão.");
      return;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        response: z
          .string()
          .describe("Resposta completa e estruturada para a imprensa"),
        tone: z
          .string()
          .describe("Tom da resposta (ex: Assertivo, Diplomático, Firme)"),
        keyMessages: z
          .array(z.string())
          .describe("3-5 mensagens-chave a transmitir"),
        alternatives: z
          .array(z.string())
          .describe("2-3 formas alternativas de responder"),
        warnings: z
          .array(z.string())
          .describe("Avisos sobre pontos sensíveis ou armadilhas na questão"),
      });

      const prompt = `Gera uma resposta política profissional para imprensa/media portuguesa:

Questão: ${question}
${context ? `Contexto: ${context}` : ""}

Cria uma resposta que seja:
1. Clara e direta
2. Alinhada com valores conservadores e nacionalistas (partido Chega)
3. Preparada para possíveis perguntas de seguimento
4. Profissional e apropriada para media
5. Com mensagens-chave bem definidas
6. Estratégica - evita armadilhas da pergunta
7. Em Português de Portugal

Inclui:
- Resposta principal completa
- Tom sugerido
- Mensagens-chave a reforçar
- Formas alternativas de responder
- Avisos sobre pontos sensíveis`;

      const result = await generateObject({
        messages: [{ role: "user", content: prompt }],
        schema,
      });

      const newResponse: QuickResponse = {
        id: Date.now().toString(),
        question: question.trim(),
        response: result.response,
        tone: result.tone,
        keyMessages: result.keyMessages,
        alternatives: result.alternatives,
        warnings: result.warnings,
        createdAt: new Date(),
      };

      addResponse(newResponse);
      setQuestion("");
      setContext("");
      setShowModal(false);
      Alert.alert("Sucesso", "Resposta gerada com sucesso!");
    } catch (error) {
      console.error("Error generating response:", error);
      Alert.alert("Erro", "Não foi possível gerar a resposta. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAsync("Confirmar", "Deseja eliminar esta resposta?");
    if (ok) removeResponse(id);
  };

  const handleCopy = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>⚡ Respostas Rápidas</Text>
              <Text style={styles.headerSubtitle}>Media e imprensa</Text>
            </View>
            <LinearGradient
              colors={["#FFD60A", "#FFA500"]}
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
        {responses.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nenhuma resposta criada</Text>
            <Text style={styles.emptySubtitle}>
              Prepare respostas rápidas para perguntas da imprensa
            </Text>
          </View>
        ) : (
          <View style={styles.responsesList}>
            {[...responses]
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
              .map((response) => (
                <LinearGradient
                  key={response.id}
                  colors={["#0f3460", "#16213e"]}
                  style={styles.responseCard}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedId(
                        expandedId === response.id ? null : response.id
                      )
                    }
                  >
                    <View style={styles.responseHeader}>
                      <View style={styles.iconContainer}>
                        <Zap size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.headerText}>
                        <Text style={styles.responseQuestion}>
                          {response.question}
                        </Text>
                        <View style={styles.toneBadge}>
                          <Text style={styles.toneText}>{response.tone}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {expandedId === response.id && (
                    <View style={styles.responseDetails}>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💬 Resposta</Text>
                        <View style={styles.responseBox}>
                          <Text style={styles.responseText}>
                            {response.response}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() =>
                            handleCopy(response.response, response.id)
                          }
                        >
                          {copiedId === response.id ? (
                            <Check size={16} color="#34C759" />
                          ) : (
                            <Copy size={16} color="#FFD60A" />
                          )}
                          <Text style={styles.copyButtonText}>
                            {copiedId === response.id
                              ? "Copiado!"
                              : "Copiar Resposta"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          🎯 Mensagens-Chave
                        </Text>
                        {(response.keyMessages || []).map((msg, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{msg}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          🔄 Alternativas
                        </Text>
                        {(response.alternatives || []).map((alt, i) => (
                          <View key={i} style={styles.altBox}>
                            <Text style={styles.altNumber}>{i + 1}</Text>
                            <Text style={styles.altText}>{alt}</Text>
                          </View>
                        ))}
                      </View>

                      {response.warnings && response.warnings.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>⚠️ Avisos</Text>
                          {(response.warnings || []).map((warn, i) => (
                            <View key={i} style={styles.warningBox}>
                              <Text style={styles.warningText}>{warn}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(response.id)}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>
                          Eliminar Resposta
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
              <Text style={styles.modalTitle}>Nova Resposta Rápida</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formSection}>
                <Text style={styles.label}>Questão/Tema *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ex: Como comenta as declarações do primeiro-ministro sobre imigração?"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Contexto (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={context}
                  onChangeText={setContext}
                  placeholder="Adicione contexto, declarações anteriores, ou detalhes relevantes..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <LinearGradient
                colors={
                  isGenerating
                    ? ["#C7C7CC", "#8E8E93"]
                    : ["#FFD60A", "#FFA500"]
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
                        A gerar...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} color="#FFFFFF" />
                      <Text style={styles.generateButtonText}>
                        Gerar Resposta
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

export default function WrappedResponsesScreen() {
  return (
    <ResponsesContext>
      <ResponsesScreen />
    </ResponsesContext>
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
    color: "#FFD60A",
    fontWeight: "500" as const,
  },
  addButton: {
    borderRadius: 24,
    shadowColor: "#FFD60A",
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
  responsesList: {
    padding: 16,
    gap: 12,
  },
  responseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#FFD60A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFD60A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  responseQuestion: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 24,
  },
  toneBadge: {
    backgroundColor: "rgba(255, 214, 10, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  toneText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#FFD60A",
    textTransform: "uppercase",
  },
  responseDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 214, 10, 0.2)",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  responseBox: {
    backgroundColor: "rgba(255, 214, 10, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD60A",
  },
  responseText: {
    fontSize: 15,
    color: "#FFFFFF",
    lineHeight: 24,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 214, 10, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFD60A",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: "#FFD60A",
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  altBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  altNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFD60A",
    color: "#000000",
    fontSize: 14,
    fontWeight: "700" as const,
    textAlign: "center",
    lineHeight: 24,
    marginRight: 12,
  },
  altText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  warningBox: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FF3B30",
  },
  warningText: {
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
    minHeight: 100,
    textAlignVertical: "top",
  },
  generateButton: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#FFD60A",
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
