import { generateObject } from "@rork/toolkit-sdk";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Check,
  Circle,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  FileText,
  Megaphone,
  Calendar,
  Vote,
  Shield,
} from "lucide-react-native";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { z } from "zod";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  category: string;
  deadline?: string;
  assignedTo?: string;
  createdAt: Date;
}

interface TaskList {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  tasks: Task[];
  createdAt: Date;
}

type TaskCategory =
  | "campanha"
  | "comunicacao"
  | "eventos"
  | "mobilizacao"
  | "legislacao"
  | "organizacao"
  | "custom";

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  campanha: <Vote size={20} color="#FFFFFF" />,
  comunicacao: <Megaphone size={20} color="#FFFFFF" />,
  eventos: <Calendar size={20} color="#FFFFFF" />,
  mobilizacao: <Users size={20} color="#FFFFFF" />,
  legislacao: <FileText size={20} color="#FFFFFF" />,
  organizacao: <Shield size={20} color="#FFFFFF" />,
  custom: <Target size={20} color="#FFFFFF" />,
};

const categoryNames: Record<TaskCategory, string> = {
  campanha: "Campanha Eleitoral",
  comunicacao: "Comunicação e Media",
  eventos: "Eventos e Comícios",
  mobilizacao: "Mobilização Popular",
  legislacao: "Trabalho Legislativo",
  organizacao: "Organização Interna",
  custom: "Personalizado",
};

const [TasksContext, useTasks] = createContextHook(() => {
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["chega-tasks"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("chega-tasks");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((tl: TaskList) => ({
        ...tl,
        createdAt: new Date(tl.createdAt),
        tasks: tl.tasks.map((t: Task) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        })),
      }));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (taskLists: TaskList[]) => {
      await AsyncStorage.setItem("chega-tasks", JSON.stringify(taskLists));
      return taskLists;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chega-tasks"] });
    },
  });

  const { mutate: syncTasks } = syncMutation;

  useEffect(() => {
    if (tasksQuery.data) {
      setTaskLists(tasksQuery.data);
    }
  }, [tasksQuery.data]);

  const addTaskList = useCallback(
    (taskList: TaskList) => {
      const updated = [...taskLists, taskList];
      setTaskLists(updated);
      syncTasks(updated);
    },
    [taskLists, syncTasks]
  );

  const updateTaskList = useCallback(
    (id: string, updatedTaskList: TaskList) => {
      const updated = taskLists.map((tl) =>
        tl.id === id ? updatedTaskList : tl
      );
      setTaskLists(updated);
      syncTasks(updated);
    },
    [taskLists, syncTasks]
  );

  const removeTaskList = useCallback(
    (id: string) => {
      const updated = taskLists.filter((tl) => tl.id !== id);
      setTaskLists(updated);
      syncTasks(updated);
    },
    [taskLists, syncTasks]
  );

  return useMemo(
    () => ({
      taskLists,
      addTaskList,
      updateTaskList,
      removeTaskList,
      isLoading: tasksQuery.isLoading,
    }),
    [taskLists, addTaskList, updateTaskList, removeTaskList, tasksQuery.isLoading]
  );
});

function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { taskLists, addTaskList, updateTaskList, removeTaskList } = useTasks();
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [expandedTaskList, setExpandedTaskList] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateTaskList = async (category: TaskCategory) => {
    setIsGenerating(true);
    setShowCategoryModal(false);

    try {
      const prompts: Record<TaskCategory, string> = {
        campanha: `Cria uma lista completa de tarefas para organizar uma campanha eleitoral do partido Chega em Portugal. 
        Inclui tarefas de preparação, estratégia, logística, comunicação digital e física, angariação de fundos, 
        organização de voluntários, análise de resultados e follow-up. Foca em ações concretas e mensuráveis.`,
        
        comunicacao: `Cria uma lista de tarefas para gerir a comunicação e presença mediática do partido Chega. 
        Inclui estratégia de redes sociais, comunicados de imprensa, gestão de crises, relação com jornalistas, 
        produção de conteúdo, assessoria de imprensa e monitoring de media. Foca em ações práticas de comunicação política.`,
        
        eventos: `Cria uma lista de tarefas para organizar eventos e comícios do partido Chega. 
        Inclui escolha de local, licenças e autorizações, segurança, som e imagem, convites e divulgação, 
        logística, catering, coordenação de equipa, discursos e cobertura mediática. Foca em todos os detalhes operacionais.`,
        
        mobilizacao: `Cria uma lista de tarefas para mobilização popular e crescimento de apoio ao partido Chega. 
        Inclui estratégias de porta-a-porta, recolha de assinaturas, organização de estruturas locais, 
        recrutamento de militantes, formação de ativistas, ações de rua e contacto direto com eleitores.`,
        
        legislacao: `Cria uma lista de tarefas para o trabalho legislativo e parlamentar do partido Chega. 
        Inclui preparação de propostas de lei, análise de diplomas, consultas públicas, reuniões com especialistas, 
        trabalho em comissões parlamentares, intervenções em plenário e fiscalização governamental.`,
        
        organizacao: `Cria uma lista de tarefas para a organização interna do partido Chega. 
        Inclui gestão administrativa, organização de estruturas distritais e concelhias, formação política, 
        sistemas de comunicação interna, gestão financeira, compliance legal e planeamento estratégico.`,
        
        custom: `Cria uma lista geral de tarefas importantes para um partido político como o Chega em Portugal. 
        Inclui as principais áreas de ação política, organizacional e estratégica. Foca em tarefas versáteis e adaptáveis.`,
      };

      const schema = z.object({
        title: z.string().describe("Título da lista de tarefas"),
        description: z
          .string()
          .describe("Breve descrição do objectivo da lista"),
        tasks: z
          .array(
            z.object({
              title: z.string().describe("Título da tarefa"),
              description: z.string().describe("Descrição detalhada da tarefa"),
              priority: z
                .enum(["high", "medium", "low"])
                .describe("Prioridade: high, medium ou low"),
              deadline: z
                .string()
                .optional()
                .describe("Prazo sugerido (ex: '7 dias', '2 semanas')"),
              assignedTo: z
                .string()
                .optional()
                .describe("Papel/função responsável (ex: 'Coordenador', 'Equipa de Comunicação')"),
            })
          )
          .describe(
            "Lista de 8-15 tarefas específicas, organizadas por ordem lógica de execução"
          ),
      });

      const result = await generateObject({
        messages: [{ role: "user", content: prompts[category] }],
        schema,
      });

      const newTaskList: TaskList = {
        id: Date.now().toString(),
        title: result.title,
        description: result.description,
        category,
        tasks: result.tasks.map((task, index) => ({
          id: `${Date.now()}_${index}`,
          title: task.title,
          description: task.description,
          priority: task.priority,
          completed: false,
          category: categoryNames[category],
          deadline: task.deadline,
          assignedTo: task.assignedTo,
          createdAt: new Date(),
        })),
        createdAt: new Date(),
      };

      addTaskList(newTaskList);
      Alert.alert("Sucesso", "Lista de tarefas gerada com IA!");
    } catch (error) {
      console.error("Error generating task list:", error);
      Alert.alert("Erro", "Não foi possível gerar a lista. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTaskCompletion = (taskListId: string, taskId: string) => {
    const taskList = taskLists.find((tl) => tl.id === taskListId);
    if (!taskList) return;

    const updatedTaskList: TaskList = {
      ...taskList,
      tasks: taskList.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    };

    updateTaskList(taskListId, updatedTaskList);
  };

  const deleteTaskList = (id: string) => {
    Alert.alert("Confirmar", "Deseja eliminar esta lista de tarefas?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => removeTaskList(id),
      },
    ]);
  };

  const deleteTask = (taskListId: string, taskId: string) => {
    const taskList = taskLists.find((tl) => tl.id === taskListId);
    if (!taskList) return;

    Alert.alert("Confirmar", "Deseja eliminar esta tarefa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          const updatedTaskList: TaskList = {
            ...taskList,
            tasks: taskList.tasks.filter((task) => task.id !== taskId),
          };
          updateTaskList(taskListId, updatedTaskList);
        },
      },
    ]);
  };

  const getTaskListProgress = (taskList: TaskList) => {
    if (taskList.tasks.length === 0) return 0;
    const completed = taskList.tasks.filter((t) => t.completed).length;
    return Math.round((completed / taskList.tasks.length) * 100);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>🎯 Tarefas Chega</Text>
            <Text style={styles.headerSubtitle}>Geradas com IA</Text>
          </View>
          <LinearGradient
            colors={["#E94E1B", "#D63E0F"]}
            style={styles.addButton}
          >
            <TouchableOpacity
              onPress={() => setShowCategoryModal(true)}
              style={styles.addButtonTouchable}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 size={24} color="#FFFFFF" />
              ) : (
                <Plus size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {taskLists.length === 0 ? (
          <View style={styles.emptyState}>
            <ListChecks size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nenhuma lista criada</Text>
            <Text style={styles.emptySubtitle}>
              Use IA para gerar listas de tarefas para diferentes situações do
              partido Chega
            </Text>
          </View>
        ) : (
          <View style={styles.taskListsContainer}>
            {[...taskLists]
              .sort((a, b) => {
                try {
                  const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
                  const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
                  return dateB.getTime() - dateA.getTime();
                } catch (error) {
                  console.error('Error sorting tasks:', error);
                  return 0;
                }
              })
              .map((taskList) => {
                const progress = getTaskListProgress(taskList);
                const isExpanded = expandedTaskList === taskList.id;

                return (
                  <LinearGradient
                    key={taskList.id}
                    colors={["#0f3460", "#16213e"]}
                    style={styles.taskListCard}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedTaskList(isExpanded ? null : taskList.id)
                      }
                    >
                      <View style={styles.taskListHeader}>
                        <LinearGradient
                          colors={["#E94E1B", "#D63E0F"]}
                          style={styles.categoryIcon}
                        >
                          {categoryIcons[taskList.category]}
                        </LinearGradient>
                        <View style={styles.taskListHeaderText}>
                          <Text style={styles.taskListTitle}>
                            {taskList.title}
                          </Text>
                          <Text style={styles.taskListCategory}>
                            {categoryNames[taskList.category]}
                          </Text>
                          <Text style={styles.taskListDescription}>
                            {taskList.description}
                          </Text>
                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  { width: `${progress}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.progressText}>
                              {progress}% • {taskList.tasks.filter((t) => t.completed).length}/
                              {taskList.tasks.length}
                            </Text>
                          </View>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color="#E94E1B" />
                        ) : (
                          <ChevronDown size={20} color="#E94E1B" />
                        )}
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.tasksContainer}>
                        {taskList.tasks.map((task) => (
                          <View key={task.id} style={styles.taskItem}>
                            <TouchableOpacity
                              style={styles.taskCheckbox}
                              onPress={() =>
                                toggleTaskCompletion(taskList.id, task.id)
                              }
                            >
                              {task.completed ? (
                                <LinearGradient
                                  colors={["#34C759", "#28A745"]}
                                  style={styles.checkbox}
                                >
                                  <Check size={16} color="#FFFFFF" />
                                </LinearGradient>
                              ) : (
                                <View style={styles.checkboxEmpty}>
                                  <Circle size={16} color="#E94E1B" />
                                </View>
                              )}
                            </TouchableOpacity>
                            <View style={styles.taskContent}>
                              <Text
                                style={[
                                  styles.taskTitle,
                                  task.completed && styles.taskTitleCompleted,
                                ]}
                              >
                                {task.title}
                              </Text>
                              <Text
                                style={[
                                  styles.taskDescription,
                                  task.completed &&
                                    styles.taskDescriptionCompleted,
                                ]}
                              >
                                {task.description}
                              </Text>
                              <View style={styles.taskMeta}>
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
                                {task.deadline && (
                                  <Text style={styles.taskMetaText}>
                                    ⏱️ {task.deadline}
                                  </Text>
                                )}
                                {task.assignedTo && (
                                  <Text style={styles.taskMetaText}>
                                    👤 {task.assignedTo}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => deleteTask(taskList.id, task.id)}
                              style={styles.deleteTaskButton}
                            >
                              <Trash2 size={16} color="#FF3B30" />
                            </TouchableOpacity>
                          </View>
                        ))}

                        <TouchableOpacity
                          style={styles.deleteListButton}
                          onPress={() => deleteTaskList(taskList.id)}
                        >
                          <Trash2 size={18} color="#FF3B30" />
                          <Text style={styles.deleteListButtonText}>
                            Eliminar Lista
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </LinearGradient>
                );
              })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha o Tipo de Tarefas</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.categoriesScroll}>
              {(Object.keys(categoryNames) as TaskCategory[]).map(
                (category) => (
                  <TouchableOpacity
                    key={category}
                    style={styles.categoryButton}
                    onPress={() => handleGenerateTaskList(category)}
                    disabled={isGenerating}
                  >
                    <LinearGradient
                      colors={["#E94E1B", "#D63E0F"]}
                      style={styles.categoryButtonIcon}
                    >
                      {categoryIcons[category]}
                    </LinearGradient>
                    <View style={styles.categoryButtonText}>
                      <Text style={styles.categoryButtonTitle}>
                        {categoryNames[category]}
                      </Text>
                      <Text style={styles.categoryButtonDescription}>
                        {category === "campanha" &&
                          "Organizar campanhas eleitorais completas"}
                        {category === "comunicacao" &&
                          "Gerir comunicação e presença mediática"}
                        {category === "eventos" &&
                          "Planear eventos e comícios"}
                        {category === "mobilizacao" &&
                          "Mobilizar apoio popular e crescimento"}
                        {category === "legislacao" &&
                          "Trabalho parlamentar e legislativo"}
                        {category === "organizacao" &&
                          "Gestão interna e estruturas"}
                        {category === "custom" && "Lista geral e versátil"}
                      </Text>
                    </View>
                    <Sparkles size={20} color="#E94E1B" />
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function WrappedTasksScreen() {
  return (
    <TasksContext>
      <TasksScreen />
    </TasksContext>
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
    color: "#E94E1B",
    fontWeight: "500" as const,
  },
  addButton: {
    borderRadius: 24,
    shadowColor: "#E94E1B",
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
  taskListsContainer: {
    padding: 16,
    gap: 12,
  },
  taskListCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#E94E1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  taskListHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskListHeaderText: {
    flex: 1,
  },
  taskListTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  taskListCategory: {
    fontSize: 13,
    color: "#E94E1B",
    fontWeight: "600" as const,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  taskListDescription: {
    fontSize: 14,
    color: "#B0B0B0",
    lineHeight: 20,
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(233, 78, 27, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E94E1B",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#E94E1B",
    fontWeight: "600" as const,
  },
  tasksContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(233, 78, 27, 0.2)",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  taskCheckbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E94E1B",
    justifyContent: "center",
    alignItems: "center",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 4,
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#8E8E93",
  },
  taskDescription: {
    fontSize: 14,
    color: "#B0B0B0",
    lineHeight: 20,
    marginBottom: 8,
  },
  taskDescriptionCompleted: {
    color: "#6E6E73",
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
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
    fontSize: 10,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  taskMetaText: {
    fontSize: 12,
    color: "#E94E1B",
  },
  deleteTaskButton: {
    padding: 4,
    marginLeft: 8,
  },
  deleteListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  deleteListButtonText: {
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
    maxHeight: "80%",
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
  categoriesScroll: {
    padding: 20,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 12,
  },
  categoryButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryButtonText: {
    flex: 1,
  },
  categoryButtonTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 4,
  },
  categoryButtonDescription: {
    fontSize: 13,
    color: "#8E8E93",
    lineHeight: 18,
  },
});
