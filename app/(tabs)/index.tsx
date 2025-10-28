import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { Plus, Calendar, Mic, Users, Trash2, Sparkles } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

interface AgendaItem {
  id: string;
  type: "meeting" | "speech";
  title: string;
  date: string;
  time: string;
  location?: string;
  notes?: string;
}

const [AgendaContext, useAgenda] = createContextHook(() => {
  const [items, setItems] = useState<AgendaItem[]>([]);

  const itemsQuery = useQuery({
    queryKey: ["agenda-items"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem("agenda-items");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (items: AgendaItem[]) => {
      await AsyncStorage.setItem("agenda-items", JSON.stringify(items));
      return items;
    },
  });

  useEffect(() => {
    if (itemsQuery.data) {
      setItems(itemsQuery.data);
    }
  }, [itemsQuery.data]);

  const addItem = (item: AgendaItem) => {
    const updated = [...items, item];
    setItems(updated);
    syncMutation.mutate(updated);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    syncMutation.mutate(updated);
  };

  return { items, addItem, removeItem, isLoading: itemsQuery.isLoading };
});

function AgendaScreen() {
  const router = useRouter();
  const { items, addItem, removeItem } = useAgenda();
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState<Partial<AgendaItem>>({
    type: "meeting",
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const handleAddItem = () => {
    if (!newItem.title?.trim() || !newItem.date?.trim() || !newItem.time?.trim()) {
      Alert.alert("Erro", "Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    addItem({
      id: Date.now().toString(),
      type: newItem.type as "meeting" | "speech",
      title: newItem.title,
      date: newItem.date,
      time: newItem.time,
      location: newItem.location,
      notes: newItem.notes,
    });

    setNewItem({
      type: "meeting",
      title: "",
      date: "",
      time: "",
      location: "",
      notes: "",
    });
    setModalVisible(false);
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

  const handleDeleteItem = async (id: string) => {
    const ok = await confirmAsync('Eliminar', 'Tem a certeza que deseja eliminar este item?');
    if (ok) removeItem(id);
  };

  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>📅 Agenda</Text>
              <Text style={styles.headerSubtitle}>Reuniões e Discursos</Text>
            </View>
            <LinearGradient
              colors={["#00D4FF", "#0099CC"]}
              style={styles.addButton}
            >
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.addButtonTouchable}
              >
                <Plus size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.quickActions}>
          <LinearGradient colors={["#E94E1B", "#FF7A45"]} style={styles.quickCard}>
            <TouchableOpacity
              onPress={() => {
                console.log("navigate -> /(tabs)/speech");
                router.push("/ai-speech");
              }}
              style={styles.quickCardInner}
              testID="go-generate-speech"
            >
              <View style={styles.quickIconWrap}>
                <Sparkles size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>Gerar Discurso (IA)</Text>
                <Text style={styles.quickSubtitle}>Crie um discurso com palavras‑chave e conformidade PT</Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
        {sortedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Sem eventos agendados</Text>
            <Text style={styles.emptySubtitle}>
              Adicione reuniões e discursos à sua agenda
            </Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {sortedItems.map((item) => (
              <LinearGradient
                key={item.id}
                colors={["#0f3460", "#16213e"]}
                style={styles.itemCard}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemTypeIcon}>
                    {item.type === "meeting" ? (
                      <Users size={20} color="#FFFFFF" />
                    ) : (
                      <Mic size={20} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.itemHeaderText}>
                    <Text style={styles.itemType}>
                      {item.type === "meeting" ? "Reunião" : "Discurso"}
                    </Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetailText}>
                    📅 {item.date} às {item.time}
                  </Text>
                  {item.location && (
                    <Text style={styles.itemDetailText}>📍 {item.location}</Text>
                  )}
                  {item.notes && (
                    <Text style={styles.itemNotes}>{item.notes}</Text>
                  )}
                </View>
              </LinearGradient>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar à Agenda</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.typeSelector}>
                <LinearGradient
                  colors={newItem.type === "meeting" ? ["#00D4FF", "#0099CC"] : ["#E5E5EA", "#F5F5F7"]}
                  style={styles.typeButton}
                >
                  <TouchableOpacity
                    style={styles.typeButtonInner}
                    onPress={() => setNewItem({ ...newItem, type: "meeting" })}
                  >
                    <Users size={20} color={newItem.type === "meeting" ? "#FFFFFF" : "#000000"} />
                    <Text
                      style={[
                        styles.typeButtonText,
                        newItem.type === "meeting" && styles.typeButtonTextActive,
                      ]}
                    >
                      Reunião
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
                <LinearGradient
                  colors={newItem.type === "speech" ? ["#00D4FF", "#0099CC"] : ["#E5E5EA", "#F5F5F7"]}
                  style={styles.typeButton}
                >
                  <TouchableOpacity
                    style={styles.typeButtonInner}
                    onPress={() => setNewItem({ ...newItem, type: "speech" })}
                  >
                    <Mic size={20} color={newItem.type === "speech" ? "#FFFFFF" : "#000000"} />
                    <Text
                      style={[
                        styles.typeButtonText,
                        newItem.type === "speech" && styles.typeButtonTextActive,
                      ]}
                    >
                      Discurso
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Título *</Text>
                <TextInput
                  style={styles.input}
                  value={newItem.title}
                  onChangeText={(text) => setNewItem({ ...newItem, title: text })}
                  placeholder="Nome do evento"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.label}>Data *</Text>
                  <TextInput
                    style={styles.input}
                    value={newItem.date}
                    onChangeText={(text) => setNewItem({ ...newItem, date: text })}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
                <View style={[styles.formSection, { flex: 1 }]}>
                  <Text style={styles.label}>Hora *</Text>
                  <TextInput
                    style={styles.input}
                    value={newItem.time}
                    onChangeText={(text) => setNewItem({ ...newItem, time: text })}
                    placeholder="HH:MM"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Local</Text>
                <TextInput
                  style={styles.input}
                  value={newItem.location}
                  onChangeText={(text) => setNewItem({ ...newItem, location: text })}
                  placeholder="Local do evento"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.label}>Notas</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newItem.notes}
                  onChangeText={(text) => setNewItem({ ...newItem, notes: text })}
                  placeholder="Informações adicionais"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddItem}
              >
                <Text style={styles.saveButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function WrappedAgendaScreen() {
  return (
    <AgendaContext>
      <AgendaScreen />
    </AgendaContext>
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
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickCard: {
    borderRadius: 16,
    shadowColor: "#E94E1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  quickCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  quickSubtitle: {
    color: "#FFE6DE",
    fontSize: 12,
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
  itemsList: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00D4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemType: {
    fontSize: 13,
    color: "#00D4FF",
    fontWeight: "600" as const,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  deleteButton: {
    padding: 4,
  },
  itemDetails: {
    gap: 6,
  },
  itemDetailText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  itemNotes: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
    lineHeight: 20,
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
    maxHeight: 500,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  typeButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#000000",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  formSection: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
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
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F7",
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#000000",
  },
  saveButton: {
    backgroundColor: "#00D4FF",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
});
