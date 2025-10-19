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
  FileDown,
  ListChecks,
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
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { z } from "zod";
import * as FileSystem from "expo-file-system";

interface TaskNote {
  task: string;
  priority: "high" | "medium" | "low";
  assignedTo?: string;
  deadline?: string;
}

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

interface Minute {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  topics: string[];
  summary: string;
  tasks: TaskNote[];
  taskList: TaskItem[];
  createdAt: Date;
}

const [MinutesContext, useMinutes] = createContextHook(() => {
  const [minutes, setMinutes] = useState<Minute[]>([]);
  const queryClient = useQueryClient();

  const minutesQuery = useQuery({
    queryKey: ["minutes"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("minutes");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((m: Minute) => ({
        ...m,
        createdAt: new Date(m.createdAt),
        taskList: m.taskList || [],
      }));
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

  const updateMinute = useCallback((id: string, updatedMinute: Minute) => {
    const updated = minutes.map((m) => (m.id === id ? updatedMinute : m));
    setMinutes(updated);
    syncMinutes(updated);
  }, [minutes, syncMinutes]);

  const removeMinute = useCallback((id: string) => {
    const updated = minutes.filter((m) => m.id !== id);
    setMinutes(updated);
    syncMinutes(updated);
  }, [minutes, syncMinutes]);

  return useMemo(
    () => ({ minutes, addMinute, updateMinute, removeMinute, isLoading: minutesQuery.isLoading }),
    [minutes, addMinute, updateMinute, removeMinute, minutesQuery.isLoading]
  );
});

function MinutesScreen() {
  const insets = useSafeAreaInsets();
  const { minutes, addMinute, updateMinute, removeMinute } = useMinutes();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [expandedMinute, setExpandedMinute] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTaskListModal, setShowTaskListModal] = useState(false);
  const [selectedMinuteForTasks, setSelectedMinuteForTasks] = useState<Minute | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
        taskList: [],
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
    if (minute.taskList && minute.taskList.length > 0) {
      text += `\n\nLISTA DE TAREFAS REALIZADAS:\n${minute.taskList
        .map((task, i) => `${i + 1}. [${task.completed ? "✓" : " "}] ${task.title}`)
        .join("\n")}`;
    }
    return text;
  };

  const generatePDF = async (minute: Minute) => {
    if (Platform.OS === 'web') {
      Alert.alert("Info", "Geração de PDF não disponível na web. Use a opção copiar e cole num editor de texto.");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                color: #333;
              }
              h1 {
                color: #00D4FF;
                border-bottom: 3px solid #00D4FF;
                padding-bottom: 10px;
              }
              h2 {
                color: #0099CC;
                margin-top: 30px;
                margin-bottom: 15px;
              }
              .info {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .info p {
                margin: 5px 0;
              }
              ul {
                line-height: 1.8;
              }
              .task {
                background: #e8f8ff;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #00D4FF;
                border-radius: 4px;
              }
              .priority-high { border-left-color: #FF3B30; }
              .priority-medium { border-left-color: #FF9500; }
              .priority-low { border-left-color: #34C759; }
              .task-meta {
                font-size: 0.9em;
                color: #666;
                margin-top: 5px;
              }
              .task-list-item {
                padding: 8px;
                margin: 5px 0;
                background: #f9f9f9;
                border-radius: 4px;
              }
              .completed {
                text-decoration: line-through;
                color: #999;
              }
            </style>
          </head>
          <body>
            <h1>MINUTA DE REUNIÃO</h1>
            <div class="info">
              <p><strong>Título:</strong> ${minute.title}</p>
              <p><strong>Data:</strong> ${minute.date}</p>
            </div>
            
            <h2>👥 Participantes</h2>
            <ul>
              ${minute.attendees.map((a) => `<li>${a}</li>`).join("")}
            </ul>
            
            <h2>📋 Tópicos Discutidos</h2>
            <ul>
              ${minute.topics.map((t) => `<li>${t}</li>`).join("")}
            </ul>
            
            <h2>📄 Resumo</h2>
            <p>${minute.summary}</p>
            
            <h2>✅ Tarefas e Ações</h2>
            ${minute.tasks
              .map(
                (task) => `
              <div class="task priority-${task.priority}">
                <strong>${task.task}</strong>
                <div class="task-meta">
                  <span>Prioridade: ${task.priority === "high" ? "ALTA" : task.priority === "medium" ? "MÉDIA" : "BAIXA"}</span>
                  ${task.assignedTo ? `<br>Responsável: ${task.assignedTo}` : ""}
                  ${task.deadline ? `<br>Prazo: ${task.deadline}` : ""}
                </div>
              </div>
            `
              )
              .join("")}
            
            ${minute.taskList && minute.taskList.length > 0 ? `
              <h2>📝 Lista de Tarefas Realizadas</h2>
              ${minute.taskList
                .map(
                  (task) => `
                <div class="task-list-item ${task.completed ? "completed" : ""}">
                  ${task.completed ? "✓" : "○"} ${task.title}
                </div>
              `
                )
                .join("")}
            ` : ""}
          </body>
        </html>
      `;

      const fileName = `minuta_${minute.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Share.share({
        url: filePath,
        message: `Minuta: ${minute.title}`,
      });

      Alert.alert("Sucesso", "PDF gerado e pronto para partilhar!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Erro", "Não foi possível gerar o PDF. Por favor, copie o texto.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const openTaskList = (minute: Minute) => {
    setSelectedMinuteForTasks(minute);
    setShowTaskListModal(true);
  };

  const addTaskToList = () => {
    if (!selectedMinuteForTasks || !newTaskTitle.trim()) return;

    const newTask: TaskItem = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: new Date(),
    };

    const updatedMinute: Minute = {
      ...selectedMinuteForTasks,
      taskList: [...(selectedMinuteForTasks.taskList || []), newTask],
    };

    updateMinute(selectedMinuteForTasks.id, updatedMinute);
    setSelectedMinuteForTasks(updatedMinute);
    setNewTaskTitle("");
  };

  const toggleTaskCompletion = (taskId: string) => {
    if (!selectedMinuteForTasks) return;

    const updatedMinute: Minute = {
      ...selectedMinuteForTasks,
      taskList: selectedMinuteForTasks.taskList.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    };

    updateMinute(selectedMinuteForTasks.id, updatedMinute);
    setSelectedMinuteForTasks(updatedMinute);
  };

  const deleteTaskFromList = (taskId: string) => {
    if (!selectedMinuteForTasks) return;

    const updatedMinute: Minute = {
      ...selectedMinuteForTasks,
      taskList: selectedMinuteForTasks.taskList.filter((task) => task.id !== taskId),
    };

    updateMinute(selectedMinuteForTasks.id, updatedMinute);
    setSelectedMinuteForTasks(updatedMinute);
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
              .sort((a, b) => {
                const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                return timeB - timeA;
              })
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
                          onPress={() => openTaskList(minute)}
                        >
                          <ListChecks size={18} color="#00D4FF" />
                          <Text style={styles.actionButtonText}>
                            Tarefas ({minute.taskList?.length || 0})
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => generatePDF(minute)}
                          disabled={isGeneratingPDF}
                        >
                          {isGeneratingPDF ? (
                            <Loader2 size={18} color="#00D4FF" />
                          ) : (
                            <FileDown size={18} color="#00D4FF" />
                          )}
                          <Text style={styles.actionButtonText}>PDF</Text>
                        </TouchableOpacity>
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

      <Modal
        visible={showTaskListModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTaskListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lista de Tarefas</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowTaskListModal(false);
                    setSelectedMinuteForTasks(null);
                    setNewTaskTitle("");
                  }}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.taskListContainer}>
                <View style={styles.addTaskSection}>
                  <TextInput
                    style={styles.taskInput}
                    value={newTaskTitle}
                    onChangeText={setNewTaskTitle}
                    placeholder="Adicionar nova tarefa..."
                    placeholderTextColor="#8E8E93"
                    onSubmitEditing={addTaskToList}
                  />
                  <TouchableOpacity
                    style={styles.addTaskButton}
                    onPress={addTaskToList}
                  >
                    <Plus size={20} color="#00D4FF" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.taskListScroll}>
                  {selectedMinuteForTasks?.taskList && selectedMinuteForTasks.taskList.length > 0 ? (
                    selectedMinuteForTasks.taskList.map((task) => (
                      <View key={task.id} style={styles.taskListItem}>
                        <TouchableOpacity
                          style={styles.taskCheckbox}
                          onPress={() => toggleTaskCompletion(task.id)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              task.completed && styles.checkboxChecked,
                            ]}
                          >
                            {task.completed && (
                              <Check size={16} color="#FFFFFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.taskListText,
                            task.completed && styles.taskListTextCompleted,
                          ]}
                        >
                          {task.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() => deleteTaskFromList(task.id)}
                          style={styles.deleteTaskButton}
                        >
                          <Trash2 size={16} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyTaskList}>
                      <ListChecks size={48} color="#C7C7CC" />
                      <Text style={styles.emptyTaskText}>
                        Nenhuma tarefa adicionada
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
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
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  taskListContainer: {
    flex: 1,
    padding: 20,
  },
  addTaskSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  taskInput: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  addTaskButton: {
    width: 50,
    height: 50,
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  taskListScroll: {
    flex: 1,
  },
  taskListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  taskCheckbox: {
    marginRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#00D4FF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#00D4FF",
  },
  taskListText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  taskListTextCompleted: {
    textDecorationLine: "line-through",
    color: "#8E8E93",
  },
  deleteTaskButton: {
    padding: 8,
  },
  emptyTaskList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTaskText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 16,
  },
});
