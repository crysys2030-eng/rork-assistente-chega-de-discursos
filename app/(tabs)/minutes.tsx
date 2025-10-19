import { generateObject } from "@rork/toolkit-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  FileText,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Calendar,
  Clock,
  CheckSquare,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";

interface TaskNote {
  task: string;
  priority: "high" | "medium" | "low";
  assignedTo?: string;
  deadline?: string;
}

interface Minute {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
  summary: string;
  tasks: TaskNote[];
  createdAt: Date;
}

const [MinutesContext, useMinutes] = createContextHook(() => {
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const queryClient = useQueryClient();

  const minutesQuery = useQuery({
    queryKey: ["minutes"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("minutes");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (minutes: Minute[]) => {
      await AsyncStorage.setItem("minutes", JSON.stringify(minutes));
      return minutes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minutes"] });
    },
  });

  const { mutate: syncMinutes } = syncMutation;

  useEffect(() => {
    if (minutesQuery.data) {
      setMinutes(minutesQuery.data);
    }
  }, [minutesQuery.data]);

  const addMinute = useCallback((minute: Minute) => {
    const updated = [...minutes, minute];
    setMinutes(updated);
    syncMinutes(updated);
  }, [minutes, syncMinutes]);

  const removeMinute = useCallback((id: string) => {
    const updated = minutes.filter((m) => m.id !== id);
    setMinutes(updated);
    syncMinutes(updated);
  }, [minutes, syncMinutes]);

  return useMemo(
    () => ({ minutes, addMinute, removeMinute, isLoading: minutesQuery.isLoading }),
    [minutes, addMinute, removeMinute, minutesQuery.isLoading]
  );
});

function MinutesScreen() {
  const insets = useSafeAreaInsets();
  const { minutes, addMinute, removeMinute } = useMinutes();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [expandedMinute, setExpandedMinute] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!meetingNotes.trim() || !meetingTitle.trim()) {
      Alert.alert("Erro", "Por favor, preencha o título e as notas da reunião.");
      return;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        date: z.string().describe("Data da reunião em formato DD/MM/YYYY"),
        attendees: z
          .array(z.string())
          .describe("Lista de participantes da reunião"),
        topics: z.array(z.string()).describe("Principais tópicos discutidos"),
        summary: z
          .string()
          .describe("Resumo detalhado da reunião com os pontos principais"),
        tasks: z
          .array(
            z.object({
              task: z.string().describe("Descrição da tarefa"),
              priority: z
                .enum(["high", "medium", "low"])
                .describe("Prioridade da tarefa"),
              assignedTo: z
                .string()
                .optional()
                .describe("Pessoa responsável pela tarefa"),
              deadline: z
                .string()
                .optional()
                .describe("Prazo em formato DD/MM/YYYY"),
            })
          )
          .describe("Lista de tarefas e ações a realizar"),
      });

      const prompt = `Analisa as seguintes notas de reunião e gera uma minuta estruturada e profissional:

Título: ${meetingTitle}
Notas: ${meetingNotes}

Cria uma minuta de reunião completa que inclua:
1. Data da reunião (inferir da informação ou usar data de hoje)
2. Lista de participantes/presentes
3. Principais tópicos discutidos (em forma de lista)
4. Resumo detalhado da reunião
5. Tarefas e ações a realizar, com:
   - Descrição clara da tarefa
   - Prioridade (alta, média ou baixa)
   - Responsável pela tarefa (se mencionado)
   - Prazo de conclusão (se mencionado)

A minuta deve ser profissional, clara e focada em pontos de ação concretos.
Contexto: Reunião do partido político Chega em Portugal.`;

      const result = await generateObject({
        messages: [{ role: "user", content: prompt }],
        schema,
      });

      const newMinute: Minute = {
        id: Date.now().toString(),
        title: meetingTitle,
        date: result.date,
        attendees: result.attendees,
        topics: result.topics,
        summary: result.summary,
        tasks: result.tasks,
        createdAt: new Date(),
      };

      addMinute(newMinute);
      setMeetingNotes("");
      setMeetingTitle("");
      setShowGenerateModal(false);
      Alert.alert("Sucesso", "Minuta gerada com sucesso!");
    } catch (error) {
      console.error("Error generating minute:", error);
      Alert.alert("Erro", "Não foi possível gerar a minuta. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Confirmar", "Deseja eliminar esta minuta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => removeMinute(id),
      },
    ]);
  };

  const handleCopy = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatMinuteText = (minute: Minute) => {
    let text = `MINUTA DE REUNIÃO\n\n`;
    text += `Título: ${minute.title}\n`;
    text += `Data: ${minute.date}\n\n`;
    text += `PARTICIPANTES:\n${minute.attendees.map((a) => `- ${a}`).join("\n")}\n\n`;
    text += `TÓPICOS DISCUTIDOS:\n${minute.topics.map((t) => `- ${t}`).join("\n")}\n\n`;
    text += `RESUMO:\n${minute.summary}\n\n`;
    text += `TAREFAS E AÇÕES:\n${minute.tasks
      .map(
        (t, i) =>
          `${i + 1}. ${t.task}\n   Prioridade: ${t.priority.toUpperCase()}${
            t.assignedTo ? `\n   Responsável: ${t.assignedTo}` : ""
          }${t.deadline ? `\n   Prazo: ${t.deadline}` : ""}`
      )
      .join("\n\n")}`;
    return text;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📝 Minutas e Tarefas</Text>
              <Text style={styles.headerSubtitle}>Geradas com IA</Text>
            </View>
            <LinearGradient
              colors={["#00D4FF", "#0099CC"]}
              style={styles.addButton}
            >
              <TouchableOpacity
                onPress={() => setShowGenerateModal(true)}
                style={styles.addButtonTouchable}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {minutes.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nenhuma minuta criada</Text>
            <Text style={styles.emptySubtitle}>
              Use IA para gerar minutas de reuniões com tarefas
            </Text>
          </View>
        ) : (
          <View style={styles.minutesList}>
            {minutes
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((minute) => (
                <LinearGradient
                  key={minute.id}
                  colors={["#0f3460", "#16213e"]}
                  style={styles.minuteCard}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedMinute(
                        expandedMinute === minute.id ? null : minute.id
                      )
                    }
                  >
                    <View style={styles.minuteHeader}>
                      <View style={styles.minuteIcon}>
                        <FileText size={20} color="#FFFFFF" />
                      </View>
                      <View style={styles.minuteHeaderText}>
                        <Text style={styles.minuteTitle}>{minute.title}</Text>
                        <View style={styles.minuteMeta}>
                          <Calendar size={12} color="#00D4FF" />
                          <Text style={styles.minuteMetaText}>
                            {minute.date}
                          </Text>
                          <CheckSquare size={12} color="#00D4FF" />
                          <Text style={styles.minuteMetaText}>
                            {minute.tasks.length} tarefas
                          </Text>
                        </View>
                      </View>
                      {expandedMinute === minute.id ? (
                        <ChevronUp size={20} color="#00D4FF" />
                      ) : (
                        <ChevronDown size={20} color="#00D4FF" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {expandedMinute === minute.id && (
                    <View style={styles.minuteDetails}>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          👥 Participantes
                        </Text>
                        {minute.attendees.map((attendee, i) => (
                          <Text key={i} style={styles.listItem}>
                            • {attendee}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Tópicos</Text>
                        {minute.topics.map((topic, i) => (
                          <Text key={i} style={styles.listItem}>
                            • {topic}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📄 Resumo</Text>
                        <Text style={styles.summaryText}>{minute.summary}</Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          ✅ Tarefas e Ações
                        </Text>
                        {minute.tasks.map((task, i) => (
                          <View key={i} style={styles.taskCard}>
                            <View style={styles.taskHeader}>
                              <View
                                style={[
                                  styles.priorityBadge,
                                  task.priority === "high" &&
                                    styles.priorityHigh,
                                  task.priority === "medium" &&
                                    styles.priorityMedium,
                                  task.priority === "low" &&
                                    styles.priorityLow,
                                ]}
                              >
                                <Text style={styles.priorityText}>
                                  {task.priority === "high"
                                    ? "ALTA"
                                    : task.priority === "medium"
                                    ? "MÉDIA"
                                    : "BAIXA"}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.taskText}>{task.task}</Text>
                            {task.assignedTo && (
                              <View style={styles.taskMeta}>
                                <Text style={styles.taskMetaText}>
                                  👤 {task.assignedTo}
                                </Text>
                              </View>
                            )}
                            {task.deadline && (
                              <View style={styles.taskMeta}>
                                <Clock size={12} color="#00D4FF" />
                                <Text style={styles.taskMetaText}>
                                  {task.deadline}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>

                      <View style={styles.minuteActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() =>
                            handleCopy(formatMinuteText(minute), minute.id)
                          }
                        >
                          {copiedId === minute.id ? (
                            <Check size={18} color="#34C759" />
                          ) : (
                            <Copy size={18} color="#00D4FF" />
                          )}
                          <Text style={styles.actionButtonText}>
                            {copiedId === minute.id ? "Copiado" : "Copiar"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteActionButton]}
                          onPress={() => handleDelete(minute.id)}
                        >
                          <Trash2 size={18} color="#FF3B30" />
                          <Text style={[styles.actionButtonText, styles.deleteActionButtonText]}>
                            Eliminar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showGenerateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Gerar Minuta com IA</Text>
                <TouchableOpacity
                  onPress={() => setShowGenerateModal(false)}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm}>
                <View style={styles.formSection}>
                  <Text style={styles.label}>Título da Reunião *</Text>
                  <TextInput
                    style={styles.input}
                    value={meetingTitle}
                    onChangeText={setMeetingTitle}
                    placeholder="Ex: Reunião Semanal de Coordenação"
                    placeholderTextColor="#8E8E93"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Notas da Reunião *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={meetingNotes}
                    onChangeText={setMeetingNotes}
                    placeholder="Cole ou escreva as notas da reunião aqui... A IA irá analisar e criar uma minuta estruturada com resumo e lista de tarefas."
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={10}
                  />
                </View>

                <LinearGradient
                  colors={
                    isGenerating
                      ? ["#C7C7CC", "#8E8E93"]
                      : ["#00D4FF", "#0099CC"]
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
                          A gerar minuta...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} color="#FFFFFF" />
                        <Text style={styles.generateButtonText}>
                          Gerar Minuta
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

export default function WrappedMinutesScreen() {
  return (
    <MinutesContext>
      <MinutesScreen />
    </MinutesContext>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingHorizontal: 20,
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
    color: "#00D4FF",
    fontWeight: "500" as const,
  },
  addButton: {
    borderRadius: 24,
    shadowColor: "#00D4FF",
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
  minutesList: {
    padding: 16,
    gap: 12,
  },
  minuteCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  minuteHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  minuteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00D4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  minuteHeaderText: {
    flex: 1,
  },
  minuteTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  minuteMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  minuteMetaText: {
    fontSize: 13,
    color: "#00D4FF",
    marginRight: 8,
  },
  minuteDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 212, 255, 0.2)",
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
  listItem: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  taskCard: {
    backgroundColor: "rgba(0, 212, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#00D4FF",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: "#FF3B30",
  },
  priorityMedium: {
    backgroundColor: "#FF9500",
  },
  priorityLow: {
    backgroundColor: "#34C759",
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  taskText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 13,
    color: "#00D4FF",
  },
  minuteActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#00D4FF",
  },
  deleteActionButton: {
    backgroundColor: "rgba(255, 59, 48, 0.2)",
  },
  deleteActionButtonText: {
    color: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalKeyboard: {
    maxHeight: "90%",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    minHeight: 200,
    textAlignVertical: "top",
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
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700" as const,
  },
});
