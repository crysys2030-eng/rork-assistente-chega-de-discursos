import { generateObject } from "@/lib/ai-bridge";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import {
  Scale,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { z } from "zod";

interface Proposal {
  id: string;
  title: string;
  category: string;
  objective: string;
  justification: string;
  mainPoints: string[];
  legalBasis: string[];
  expectedImpact: string;
  timeline: string;
  stakeholders: string[];
  budgetEstimate?: string;
  status: "draft" | "review" | "ready";
  createdAt: Date;
}

const [ProposalsContext, useProposals] = createContextHook(() => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const queryClient = useQueryClient();

  const proposalsQuery = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("proposals");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
      }));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (proposals: Proposal[]) => {
      await AsyncStorage.setItem("proposals", JSON.stringify(proposals));
      return proposals;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const { mutate: syncProposals } = syncMutation;

  useEffect(() => {
    if (proposalsQuery.data) {
      setProposals(proposalsQuery.data);
    }
  }, [proposalsQuery.data]);

  const addProposal = useCallback(
    (proposal: Proposal) => {
      const updated = [...proposals, proposal];
      setProposals(updated);
      syncProposals(updated);
    },
    [proposals, syncProposals]
  );

  const updateProposal = useCallback(
    (id: string, updatedProposal: Proposal) => {
      const updated = proposals.map((p) =>
        p.id === id ? updatedProposal : p
      );
      setProposals(updated);
      syncProposals(updated);
    },
    [proposals, syncProposals]
  );

  const removeProposal = useCallback(
    (id: string) => {
      const updated = proposals.filter((p) => p.id !== id);
      setProposals(updated);
      syncProposals(updated);
    },
    [proposals, syncProposals]
  );

  return useMemo(
    () => ({
      proposals,
      addProposal,
      updateProposal,
      removeProposal,
      isLoading: proposalsQuery.isLoading,
    }),
    [proposals, addProposal, updateProposal, removeProposal, proposalsQuery.isLoading]
  );
});

function ProposalsScreen() {
  const insets = useSafeAreaInsets();
  const { proposals, addProposal, updateProposal, removeProposal } = useProposals();
  const [showModal, setShowModal] = useState(false);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
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
      Alert.alert("Erro", "Por favor, insira um tema para a proposta.");
      return;
    }

    setIsGenerating(true);
    try {
      const schema = z.object({
        title: z
          .string()
          .describe("Título oficial da proposta legislativa"),
        category: z
          .string()
          .describe("Categoria (ex: Saúde, Economia, Justiça, Educação)"),
        objective: z
          .string()
          .describe("Objetivo principal da proposta"),
        justification: z
          .string()
          .describe("Justificação detalhada da necessidade da proposta"),
        mainPoints: z
          .array(z.string())
          .describe("5-8 pontos principais da proposta"),
        legalBasis: z
          .array(z.string())
          .describe("Base legal e artigos constitucionais relevantes"),
        expectedImpact: z
          .string()
          .describe("Impacto esperado na sociedade portuguesa"),
        timeline: z
          .string()
          .describe("Cronograma de implementação sugerido"),
        stakeholders: z
          .array(z.string())
          .describe("Partes interessadas e entidades envolvidas"),
        budgetEstimate: z
          .string()
          .optional()
          .describe("Estimativa orçamental se aplicável"),
      });

      const prompt = `Cria uma proposta legislativa profissional e detalhada para o parlamento português:

Tema: ${topic}
${description ? `Descrição: ${description}` : ""}

A proposta deve ser:
1. Alinhada com os valores do partido Chega (conservadorismo, nacionalismo)
2. Tecnicamente viável e constitucionalmente válida
3. Com base legal sólida no ordenamento jurídico português
4. Focada em resolver problemas concretos dos portugueses
5. Com cronograma realista de implementação
6. Considerando impacto orçamental e social

Estrutura completa incluindo:
- Título oficial adequado
- Categoria legislativa
- Objetivo claro e mensurável
- Justificação robusta
- Pontos principais detalhados
- Base legal (Constituição, leis existentes)
- Impacto esperado
- Cronograma de implementação
- Stakeholders e entidades envolvidas
- Estimativa orçamental se relevante

Linguagem formal em Português de Portugal adequada ao contexto parlamentar.`;

      const result = await generateObject({
        messages: [{ role: "user", content: prompt }],
        schema,
      });

      const newProposal: Proposal = {
        id: Date.now().toString(),
        title: result.title,
        category: result.category,
        objective: result.objective,
        justification: result.justification,
        mainPoints: result.mainPoints,
        legalBasis: result.legalBasis,
        expectedImpact: result.expectedImpact,
        timeline: result.timeline,
        stakeholders: result.stakeholders,
        budgetEstimate: result.budgetEstimate,
        status: "draft",
        createdAt: new Date(),
      };

      addProposal(newProposal);
      setTopic("");
      setDescription("");
      setShowModal(false);
      Alert.alert("Sucesso", "Proposta legislativa gerada com sucesso!");
    } catch (error) {
      console.error("Error generating proposal:", error);
      Alert.alert("Erro", "Não foi possível gerar a proposta. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmAsync(
      "Confirmar",
      "Deseja eliminar esta proposta?"
    );
    if (ok) removeProposal(id);
  };

  const handleStatusChange = (id: string, newStatus: Proposal["status"]) => {
    const proposal = proposals.find((p) => p.id === id);
    if (!proposal) return;
    updateProposal(id, { ...proposal, status: newStatus });
  };

  const getStatusIcon = (status: Proposal["status"]) => {
    switch (status) {
      case "draft":
        return <AlertCircle size={18} color="#FF9500" />;
      case "review":
        return <Clock size={18} color="#007AFF" />;
      case "ready":
        return <CheckCircle2 size={18} color="#34C759" />;
    }
  };

  const getStatusColor = (status: Proposal["status"]) => {
    switch (status) {
      case "draft":
        return "#FF9500";
      case "review":
        return "#007AFF";
      case "ready":
        return "#34C759";
    }
  };

  const getStatusText = (status: Proposal["status"]) => {
    switch (status) {
      case "draft":
        return "RASCUNHO";
      case "review":
        return "EM REVISÃO";
      case "ready":
        return "PRONTO";
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
              <Text style={styles.headerTitle}>⚖️ Propostas</Text>
              <Text style={styles.headerSubtitle}>Legislação com IA</Text>
            </View>
            <LinearGradient
              colors={["#007AFF", "#0051D5"]}
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
        {!proposals || proposals.length === 0 ? (
          <View style={styles.emptyState}>
            <Scale size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Nenhuma proposta criada</Text>
            <Text style={styles.emptySubtitle}>
              Crie propostas legislativas profissionais com IA
            </Text>
          </View>
        ) : (
          <View style={styles.proposalsList}>
            {[...proposals]
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
              .map((proposal) => (
                <LinearGradient
                  key={proposal.id}
                  colors={["#0f3460", "#16213e"]}
                  style={styles.proposalCard}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedId(
                        expandedId === proposal.id ? null : proposal.id
                      )
                    }
                  >
                    <View style={styles.proposalHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <Scale size={20} color="#FFFFFF" />
                        </View>
                        <View style={styles.headerText}>
                          <Text style={styles.categoryText}>
                            {proposal.category}
                          </Text>
                          <Text style={styles.proposalTitle}>
                            {proposal.title}
                          </Text>
                          <View style={styles.statusRow}>
                            {getStatusIcon(proposal.status)}
                            <Text
                              style={[
                                styles.statusText,
                                { color: getStatusColor(proposal.status) },
                              ]}
                            >
                              {getStatusText(proposal.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {expandedId === proposal.id ? (
                        <ChevronUp size={20} color="#007AFF" />
                      ) : (
                        <ChevronDown size={20} color="#007AFF" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {expandedId === proposal.id && (
                    <View style={styles.proposalDetails}>
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎯 Objetivo</Text>
                        <Text style={styles.contentText}>
                          {proposal.objective}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📋 Justificação</Text>
                        <Text style={styles.contentText}>
                          {proposal.justification}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          📌 Pontos Principais
                        </Text>
                        {proposal.mainPoints.map((point, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>{i + 1}.</Text>
                            <Text style={styles.listText}>{point}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>⚖️ Base Legal</Text>
                        {proposal.legalBasis.map((basis, i) => (
                          <View key={i} style={styles.legalItem}>
                            <Text style={styles.legalText}>{basis}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          📊 Impacto Esperado
                        </Text>
                        <Text style={styles.contentText}>
                          {proposal.expectedImpact}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📅 Cronograma</Text>
                        <Text style={styles.contentText}>
                          {proposal.timeline}
                        </Text>
                      </View>

                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                          👥 Partes Interessadas
                        </Text>
                        {proposal.stakeholders.map((stakeholder, i) => (
                          <View key={i} style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>{stakeholder}</Text>
                          </View>
                        ))}
                      </View>

                      {proposal.budgetEstimate && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>
                            💰 Estimativa Orçamental
                          </Text>
                          <Text style={styles.contentText}>
                            {proposal.budgetEstimate}
                          </Text>
                        </View>
                      )}

                      <View style={styles.statusButtons}>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            proposal.status === "draft" &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleStatusChange(proposal.id, "draft")
                          }
                        >
                          <AlertCircle size={16} color="#FF9500" />
                          <Text style={styles.statusButtonText}>Rascunho</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            proposal.status === "review" &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleStatusChange(proposal.id, "review")
                          }
                        >
                          <Clock size={16} color="#007AFF" />
                          <Text style={styles.statusButtonText}>Revisão</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            proposal.status === "ready" &&
                              styles.statusButtonActive,
                          ]}
                          onPress={() =>
                            handleStatusChange(proposal.id, "ready")
                          }
                        >
                          <CheckCircle2 size={16} color="#34C759" />
                          <Text style={styles.statusButtonText}>Pronto</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(proposal.id)}
                      >
                        <Trash2 size={18} color="#FF3B30" />
                        <Text style={styles.deleteButtonText}>
                          Eliminar Proposta
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
              <Text style={styles.modalTitle}>Nova Proposta Legislativa</Text>
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
                  placeholder="Ex: Reforma do sistema de saúde"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Descrição (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Adicione detalhes sobre o contexto, problemas a resolver, objetivos específicos..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                />
              </View>

              <LinearGradient
                colors={
                  isGenerating
                    ? ["#C7C7CC", "#8E8E93"]
                    : ["#007AFF", "#0051D5"]
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
                        Gerar Proposta
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

export default function WrappedProposalsScreen() {
  return (
    <ProposalsContext>
      <ProposalsScreen />
    </ProposalsContext>
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
    color: "#007AFF",
    fontWeight: "500" as const,
  },
  addButton: {
    borderRadius: 24,
    shadowColor: "#007AFF",
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
  proposalsList: {
    padding: 16,
    gap: 12,
  },
  proposalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  proposalHeader: {
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
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#007AFF",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  proposalTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 8,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700" as const,
  },
  proposalDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 122, 255, 0.2)",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  contentText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: "#007AFF",
    marginRight: 8,
    fontWeight: "700" as const,
    minWidth: 20,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  legalItem: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  legalText: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 20,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  statusButtonActive: {
    backgroundColor: "rgba(0, 122, 255, 0.2)",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
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
    shadowColor: "#007AFF",
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
