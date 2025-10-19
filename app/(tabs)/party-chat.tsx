import { Stack } from "expo-router";
import {
  Users,
  Plus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Key,
  Send,
  MoreVertical,
  LogOut,
} from "lucide-react-native";
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
  Modal,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ChatRoom = {
  id: string;
  name: string;
  isActive: boolean;
  isPrivate: boolean;
  encryptionKey: string;
  createdAt: Date;
  isUrgent: boolean;
};

type Message = {
  id: string;
  roomId: string;
  text: string;
  username: string;
  timestamp: Date;
};

export default function PartyChatScreen() {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("Membro");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [roomToJoin, setRoomToJoin] = useState<ChatRoom | null>(null);

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomKey, setNewRoomKey] = useState("");
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(true);
  const [newRoomIsUrgent, setNewRoomIsUrgent] = useState(false);
  const [joinRoomKey, setJoinRoomKey] = useState("");

  const generateKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewRoomKey(key);
  };

  const createRoom = () => {
    if (!newRoomName.trim() || !newRoomKey.trim()) {
      Alert.alert("Erro", "Preencha o nome e a chave da sala");
      return;
    }

    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      name: newRoomName,
      isActive: true,
      isPrivate: newRoomIsPrivate,
      encryptionKey: newRoomKey,
      createdAt: new Date(),
      isUrgent: newRoomIsUrgent,
    };

    setRooms([...rooms, newRoom]);
    setNewRoomName("");
    setNewRoomKey("");
    setNewRoomIsPrivate(true);
    setNewRoomIsUrgent(false);
    setShowCreateModal(false);
    Alert.alert("Sucesso", `Sala "${newRoom.name}" criada com sucesso!`);
  };

  const joinRoom = (room: ChatRoom) => {
    if (room.encryptionKey !== joinRoomKey) {
      Alert.alert("Erro", "Chave de encriptação incorreta");
      return;
    }

    setSelectedRoom(room);
    setJoinRoomKey("");
    setShowJoinModal(false);
  };

  const toggleRoomStatus = (roomId: string) => {
    setRooms(
      rooms.map((room) =>
        room.id === roomId ? { ...room, isActive: !room.isActive } : room
      )
    );
  };

  const leaveRoom = () => {
    setSelectedRoom(null);
    setMessages([]);
  };

  const sendMessage = () => {
    if (!input.trim() || !selectedRoom) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      roomId: selectedRoom.id,
      text: input,
      username: username,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput("");
  };

  const deleteRoom = (roomId: string) => {
    Alert.alert(
      "Confirmar",
      "Deseja realmente eliminar esta sala?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setRooms(rooms.filter((room) => room.id !== roomId));
            if (selectedRoom?.id === roomId) {
              setSelectedRoom(null);
              setMessages([]);
            }
          },
        },
      ]
    );
  };

  if (selectedRoom) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.chatHeader, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={leaveRoom} style={styles.backButton}>
            <Text style={styles.backText}>← Voltar</Text>
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.roomHeaderRow}>
              <Text style={styles.chatHeaderTitle}>{selectedRoom.name}</Text>
              {selectedRoom.isUrgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentText}>URGENTE</Text>
                </View>
              )}
            </View>
            <View style={styles.roomInfoRow}>
              {selectedRoom.isPrivate ? (
                <Lock size={14} color="#8E8E93" />
              ) : (
                <Unlock size={14} color="#8E8E93" />
              )}
              <Text style={styles.chatHeaderSubtitle}>
                {selectedRoom.isPrivate ? "Privada" : "Pública"} •{" "}
                {selectedRoom.isActive ? "Ativa" : "Inativa"}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowRoomSettings(true)}>
            <MoreVertical size={24} color="#E94E1B" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.filter((m) => m.roomId === selectedRoom.id).length ===
            0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>
                  Sala pronta para comunicação
                </Text>
                <Text style={styles.emptySubtitle}>
                  Comece a conversa com o seu partido
                </Text>
              </View>
            ) : (
              messages
                .filter((m) => m.roomId === selectedRoom.id)
                .map((msg) => (
                  <View key={msg.id} style={styles.messageWrapper}>
                    <View style={styles.messageBubble}>
                      <Text style={styles.messageUsername}>
                        {msg.username}
                      </Text>
                      <Text style={styles.messageText}>{msg.text}</Text>
                      <Text style={styles.messageTime}>
                        {msg.timestamp.toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Escreva a sua mensagem..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !input.trim() && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!input.trim()}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal
          visible={showRoomSettings}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRoomSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.settingsModal}>
              <Text style={styles.settingsTitle}>Definições da Sala</Text>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Nome de Utilizador</Text>
                <TextInput
                  style={styles.settingInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="O seu nome"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Chave de Encriptação</Text>
                <View style={styles.keyDisplay}>
                  <Key size={16} color="#E94E1B" />
                  <Text style={styles.keyText}>{selectedRoom.encryptionKey}</Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Estado da Sala</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.statusText}>
                    {selectedRoom.isActive ? "Ativa" : "Inativa"}
                  </Text>
                  <Switch
                    value={selectedRoom.isActive}
                    onValueChange={() => toggleRoomStatus(selectedRoom.id)}
                    trackColor={{ false: "#C7C7CC", true: "#E94E1B" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => {
                  setShowRoomSettings(false);
                  leaveRoom();
                }}
              >
                <LogOut size={20} color="#FFFFFF" />
                <Text style={styles.leaveButtonText}>Sair da Sala</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setShowRoomSettings(false);
                  deleteRoom(selectedRoom.id);
                }}
              >
                <Text style={styles.deleteButtonText}>Eliminar Sala</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowRoomSettings(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Chat do Partido</Text>
        <Text style={styles.headerSubtitle}>
          Comunicação segura para urgências
        </Text>
      </View>

      <ScrollView style={styles.roomsList}>
        {rooms.length === 0 ? (
          <View style={styles.emptyRooms}>
            <Users size={64} color="#C7C7CC" />
            <Text style={styles.emptyRoomsTitle}>Nenhuma sala criada</Text>
            <Text style={styles.emptyRoomsSubtitle}>
              Crie uma sala para começar a comunicar
            </Text>
          </View>
        ) : (
          rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.roomCard}
              onPress={() => {
                setRoomToJoin(room);
                setShowJoinModal(true);
              }}
            >
              <View style={styles.roomIcon}>
                {room.isPrivate ? (
                  <Lock size={24} color="#E94E1B" />
                ) : (
                  <Unlock size={24} color="#8E8E93" />
                )}
              </View>
              <View style={styles.roomInfo}>
                <View style={styles.roomNameRow}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  {room.isUrgent && (
                    <View style={styles.urgentBadgeSmall}>
                      <Text style={styles.urgentTextSmall}>URGENTE</Text>
                    </View>
                  )}
                </View>
                <View style={styles.roomMeta}>
                  <View
                    style={[
                      styles.statusDot,
                      room.isActive
                        ? styles.statusActive
                        : styles.statusInactive,
                    ]}
                  />
                  <Text style={styles.roomMetaText}>
                    {room.isActive ? "Ativa" : "Inativa"} •{" "}
                    {room.isPrivate ? "Privada" : "Pública"}
                  </Text>
                </View>
              </View>
              <View style={styles.roomKeyIcon}>
                <Key size={20} color="#C7C7CC" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setShowCreateModal(true)}
      >
        <Plus size={24} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Criar Nova Sala</Text>
      </TouchableOpacity>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Criar Nova Sala</Text>

            <Text style={styles.label}>Nome da Sala</Text>
            <TextInput
              style={styles.modalInput}
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholder="Ex: Urgências Nacional"
              placeholderTextColor="#8E8E93"
            />

            <Text style={styles.label}>Chave de Encriptação</Text>
            <View style={styles.keyInputRow}>
              <TextInput
                style={[styles.modalInput, styles.keyInput]}
                value={newRoomKey}
                onChangeText={setNewRoomKey}
                placeholder="Chave segura"
                placeholderTextColor="#8E8E93"
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateKey}
              >
                <Key size={20} color="#E94E1B" />
              </TouchableOpacity>
            </View>
            {newRoomKey && (
              <Text style={styles.keyPreview}>Chave: {newRoomKey}</Text>
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                {newRoomIsPrivate ? (
                  <Eye size={20} color="#E94E1B" />
                ) : (
                  <EyeOff size={20} color="#8E8E93" />
                )}
                <Text style={styles.switchLabel}>
                  {newRoomIsPrivate ? "Sala Privada" : "Sala Pública"}
                </Text>
              </View>
              <Switch
                value={newRoomIsPrivate}
                onValueChange={setNewRoomIsPrivate}
                trackColor={{ false: "#C7C7CC", true: "#E94E1B" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Marcar como Urgente</Text>
              </View>
              <Switch
                value={newRoomIsUrgent}
                onValueChange={setNewRoomIsUrgent}
                trackColor={{ false: "#C7C7CC", true: "#E94E1B" }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={createRoom}>
              <Text style={styles.modalButtonText}>Criar Sala</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Entrar na Sala</Text>
            {roomToJoin && (
              <Text style={styles.modalSubtitle}>
                {roomToJoin.name}
              </Text>
            )}

            <Text style={styles.label}>Chave de Encriptação</Text>
            <TextInput
              style={styles.modalInput}
              value={joinRoomKey}
              onChangeText={setJoinRoomKey}
              placeholder="Insira a chave da sala"
              placeholderTextColor="#8E8E93"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => roomToJoin && joinRoom(roomToJoin)}
            >
              <Text style={styles.modalButtonText}>Entrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowJoinModal(false);
                setRoomToJoin(null);
                setJoinRoomKey("");
              }}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
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
  roomsList: {
    flex: 1,
    padding: 16,
  },
  emptyRooms: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyRoomsTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyRoomsSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  roomName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#000000",
  },
  roomMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusActive: {
    backgroundColor: "#34C759",
  },
  statusInactive: {
    backgroundColor: "#C7C7CC",
  },
  roomMetaText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  roomKeyIcon: {
    marginLeft: 8,
  },
  urgentBadgeSmall: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentTextSmall: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E94E1B",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  settingsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    marginBottom: 12,
  },
  keyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  keyInput: {
    flex: 1,
    marginBottom: 0,
  },
  generateButton: {
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  keyPreview: {
    fontSize: 14,
    color: "#E94E1B",
    marginTop: 8,
    marginBottom: 12,
    fontWeight: "600" as const,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    marginTop: 8,
  },
  switchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500" as const,
  },
  modalButton: {
    backgroundColor: "#E94E1B",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  modalCancelButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    color: "#8E8E93",
    fontSize: 17,
    fontWeight: "500" as const,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 17,
    color: "#E94E1B",
    fontWeight: "500" as const,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  roomHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#000000",
  },
  urgentBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  roomInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatHeaderSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  messageUsername: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#E94E1B",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#8E8E93",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    alignItems: "flex-end",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000000",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#E94E1B",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 8,
  },
  settingInput: {
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
  },
  keyDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F2",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  keyText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#E94E1B",
    flex: 1,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500" as const,
  },
  leaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9500",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  leaveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  deleteButton: {
    backgroundColor: "#FFF5F2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  closeButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  closeButtonText: {
    color: "#8E8E93",
    fontSize: 17,
    fontWeight: "500" as const,
  },
});
