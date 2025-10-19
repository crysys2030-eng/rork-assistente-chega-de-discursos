import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { Plus, Calendar, Mic, Users, Trash2 } from "lucide-react-native";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      "Eliminar",
      "Tem a certeza que deseja eliminar este item?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => removeItem(id), style: "destructive" },
      ]
    );
  };

  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.time}`);
    const dateB = new Date(`${b.date} ${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Agenda</Text>
          <Text style={styles.headerSubtitle}>Reuniões e Discursos</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
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
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTypeIcon}>
                    {item.type === "meeting" ? (
                      <Users size={20} color="#E94E1B" />
                    ) : (
                      <Mic size={20} color="#E94E1B" />
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
                    <Trash2 size={20} color="#8E8E93" />
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
              </View>
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
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newItem.type === "meeting" && styles.typeButtonActive,
                  ]}
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
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    newItem.type === "speech" && styles.typeButtonActive,
                  ]}
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
    </SafeAreaView>
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
    backgroundColor: "#F5F5F7",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    fontWeight: "500" as const,
  },
  addButton: {
    backgroundColor: "#E94E1B",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
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
    color: "#000000",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: "#FFF5F2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemType: {
    fontSize: 13,
    color: "#E94E1B",
    fontWeight: "600" as const,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#000000",
  },
  deleteButton: {
    padding: 4,
  },
  itemDetails: {
    gap: 6,
  },
  itemDetailText: {
    fontSize: 15,
    color: "#000000",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F5F5F7",
    borderWidth: 2,
    borderColor: "#E5E5EA",
  },
  typeButtonActive: {
    backgroundColor: "#E94E1B",
    borderColor: "#E94E1B",
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
    backgroundColor: "#E94E1B",
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
});
