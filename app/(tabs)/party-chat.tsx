import { Stack, useLocalSearchParams } from "expo-router";
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
  Share2,
  Crown,
  UserCircle,
  Copy,
  Check,
  Shield,
  Trash2,
  QrCode,
  Camera as CameraIcon,
  X,
} from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
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
  Linking,
  Share,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { CameraView, useCameraPermissions } from "expo-camera";

type UserRole = "admin" | "guest";

type ChatRoom = {
  id: string;
  name: string;
  isActive: boolean;
  isPrivate: boolean;
  encryptionKey: string;
  createdAt: Date;
  isUrgent: boolean;
  adminId: string;
};

type Message = {
  id: string;
  roomId: string;
  text: string;
  username: string;
  timestamp: Date;
  userId: string;
  role: UserRole;
};

export default function PartyChatScreen() {
  const params = useLocalSearchParams();
  const hasProcessedDeepLink = useRef(false);
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("Membro");
  const [userId] = useState(`user_${Date.now()}`);
  const [userRole, setUserRole] = useState<UserRole>("guest");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [roomToJoin, setRoomToJoin] = useState<ChatRoom | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showGuestInviteModal, setShowGuestInviteModal] = useState(false);
  const [guestInviteLink, setGuestInviteLink] = useState("");

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomKey, setNewRoomKey] = useState("");
  const [newRoomIsPrivate, setNewRoomIsPrivate] = useState(true);
  const [newRoomIsUrgent, setNewRoomIsUrgent] = useState(false);
  const [joinRoomKey, setJoinRoomKey] = useState("");

  useEffect(() => {
    if (params.roomId && params.key && !hasProcessedDeepLink.current) {
      hasProcessedDeepLink.current = true;
      const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
      const key = Array.isArray(params.key) ? params.key[0] : params.key;
      const guestId = Array.isArray(params.guestId) ? params.guestId[0] : params.guestId;
      const autoJoin = Array.isArray(params.autoJoin) ? params.autoJoin[0] : params.autoJoin;
      const guestUsername = Array.isArray(params.username) ? params.username[0] : params.username;
      
      const existingRoom = rooms.find(r => r.id === roomId);
      if (existingRoom) {
        if (autoJoin === "true" && guestId) {
          if (existingRoom.encryptionKey === key) {
            if (guestUsername) {
              setUsername(guestUsername);
            }
            setUserRole("guest");
            setSelectedRoom(existingRoom);
            Alert.alert("Bem-vindo!", `Entrou na sala "${existingRoom.name}" como convidado.`);
          } else {
            Alert.alert("Erro", "Link de convite inválido.");
          }
        } else {
          setRoomToJoin(existingRoom);
          setJoinRoomKey(key);
          setShowJoinModal(true);
        }
      } else {
        Alert.alert("Erro", "Sala não encontrada. Peça ao administrador para reenviar o convite.");
      }
    }
  }, [params, rooms]);

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
      adminId: userId,
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

    const isAdmin = room.adminId === userId;
    setUserRole(isAdmin ? "admin" : "guest");
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
      userId: userId,
      role: userRole,
    };

    setMessages([...messages, newMessage]);
    setInput("");
  };

  const deleteMessage = (messageId: string) => {
    Alert.alert(
      "Eliminar Mensagem",
      "Deseja eliminar esta mensagem?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setMessages(messages.filter((m) => m.id !== messageId));
          },
        },
      ]
    );
  };

  const shareToWhatsApp = async (room: ChatRoom) => {
    const appLink = `exp://192.168.1.100:8081/--/party-chat?roomId=${room.id}&key=${encodeURIComponent(room.encryptionKey)}`;
    
    const message = `🔐 *Convite para Sala do Partido Chega*\n\n📌 *Sala:* ${room.name}\n🔑 *Código:* ${room.encryptionKey}\n\n🔗 *Link de Acesso:*\n${appLink}\n\nClique no link ou abra a aplicação e use o código acima para aceder.`;

    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          message: message,
          title: `Convite: ${room.name}`,
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      await Share.share({
        message: message,
        title: `Convite: ${room.name}`,
      });
    }
  };

  const generateGuestCredentials = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let guestId = "guest_";
    for (let i = 0; i < 12; i++) {
      guestId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return guestId;
  };

  const inviteAsGuest = (room: ChatRoom) => {
    const encryptedGuestId = generateGuestCredentials();
    const guestUsername = `Guest_${encryptedGuestId.substring(6, 10)}`;
    
    const appLink = `exp://192.168.1.100:8081/--/party-chat?roomId=${room.id}&key=${encodeURIComponent(room.encryptionKey)}&guestId=${encryptedGuestId}&username=${encodeURIComponent(guestUsername)}&autoJoin=true`;
    
    setGuestInviteLink(appLink);
    setShowGuestInviteModal(true);
  };

  const showQRCode = (room: ChatRoom) => {
    const appLink = `exp://192.168.1.100:8081/--/party-chat?roomId=${room.id}&key=${encodeURIComponent(room.encryptionKey)}&username=${encodeURIComponent(username)}`;
    
    const qrData = JSON.stringify({
      roomId: room.id,
      roomName: room.name,
      key: room.encryptionKey,
      link: appLink,
      type: "chega-room-invite"
    });
    
    setQrCodeData(qrData);
    
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(appLink)}`;
    setQrImageUrl(qrApiUrl);
    
    setShowQRModal(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      setShowScanner(false);
      
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        if (data.includes('party-chat?')) {
          const url = new URL(data);
          const roomId = url.searchParams.get('roomId');
          const key = url.searchParams.get('key');
          const suggestedUsername = url.searchParams.get('username') || 'Novo Membro';
          
          if (roomId && key) {
            parsedData = { roomId, key, suggestedUsername };
          }
        }
      }

      if (parsedData && parsedData.roomId && parsedData.key) {
        const room = rooms.find(r => r.id === parsedData.roomId);
        
        if (!room) {
          Alert.alert("Erro", "Sala não encontrada. Certifique-se de que a sala ainda existe.");
          return;
        }

        if (parsedData.suggestedUsername && username === "Membro") {
          setUsername(parsedData.suggestedUsername);
        }

        setRoomToJoin(room);
        setJoinRoomKey(parsedData.key);
        
        Alert.alert(
          "Entrar na Sala",
          `Deseja entrar na sala "${room.name}"?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Entrar",
              onPress: () => {
                if (room.encryptionKey === parsedData.key) {
                  const isAdmin = room.adminId === userId;
                  setUserRole(isAdmin ? "admin" : "guest");
                  setSelectedRoom(room);
                  setJoinRoomKey("");
                  Alert.alert("Sucesso", `Bem-vindo à sala "${room.name}"!`);
                } else {
                  Alert.alert("Erro", "Chave de encriptação incorreta");
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Erro", "QR Code inválido. Use um código gerado pela aplicação.");
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      Alert.alert("Erro", "Não foi possível processar o QR Code.");
    }
  };

  const openScanner = async () => {
    if (!permission) {
      await requestPermission();
      return;
    }

    if (!permission.granted) {
      Alert.alert(
        "Permissão Necessária",
        "Precisamos de acesso à câmera para escanear QR Codes.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Permitir", onPress: requestPermission },
        ]
      );
      return;
    }

    setShowScanner(true);
  };

  const copyKey = async (key: string) => {
    await Clipboard.setStringAsync(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
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
        <LinearGradient
          colors={["#1a1a2e", "#16213e"]}
          style={[styles.chatHeader, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={leaveRoom} style={styles.backButton}>
              <Text style={styles.backText}>← Voltar</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <View style={styles.roomHeaderRow}>
                <Text style={styles.chatHeaderTitle}>{selectedRoom.name}</Text>
                {selectedRoom.isUrgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>🚨 URGENTE</Text>
                  </View>
                )}
              </View>
              <View style={styles.roomInfoRow}>
                {userRole === "admin" ? (
                  <Crown size={14} color="#FFD700" />
                ) : (
                  <UserCircle size={14} color="#00D4FF" />
                )}
                <Text style={styles.chatHeaderSubtitle}>
                  {userRole === "admin" ? "Admin" : "Convidado"} • {selectedRoom.isPrivate ? "Privada" : "Pública"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowRoomSettings(true)}>
              <MoreVertical size={24} color="#00D4FF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

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
                    <View style={styles.messageContainer}>
                      <View style={[
                        styles.messageBubble,
                        msg.userId === userId ? styles.myMessageBubble : styles.otherMessageBubble
                      ]}>
                        <View style={styles.messageHeader}>
                          {msg.role === "admin" ? (
                            <Crown size={14} color="#FFD700" />
                          ) : (
                            <UserCircle size={14} color="#00D4FF" />
                          )}
                          <Text style={[
                            styles.messageUsername,
                            msg.userId === userId && styles.myMessageUsername
                          ]}>
                            {msg.username} {msg.userId === userId ? "(Você)" : ""}
                          </Text>
                        </View>
                        <Text style={[
                          styles.messageText,
                          msg.userId === userId && styles.myMessageText
                        ]}>{msg.text}</Text>
                        <Text style={[
                          styles.messageTime,
                          msg.userId === userId && styles.myMessageTime
                        ]}>
                          {msg.timestamp.toLocaleTimeString("pt-PT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      {(msg.userId === userId || userRole === "admin") && (
                        <TouchableOpacity
                          onPress={() => deleteMessage(msg.id)}
                          style={styles.deleteMessageButton}
                        >
                          <Trash2 size={14} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
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
                <TouchableOpacity
                  style={styles.keyDisplay}
                  onPress={() => copyKey(selectedRoom.encryptionKey)}
                >
                  <Key size={16} color="#E94E1B" />
                  <Text style={styles.keyText}>{selectedRoom.encryptionKey}</Text>
                  {copiedKey ? (
                    <Check size={16} color="#34C759" />
                  ) : (
                    <Copy size={16} color="#8E8E93" />
                  )}
                </TouchableOpacity>
              </View>

              {userRole === "admin" && (
                <>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Partilhar Sala</Text>
                    <View style={styles.shareButtonsRow}>
                      <TouchableOpacity
                        style={styles.shareButton}
                        onPress={() => shareToWhatsApp(selectedRoom)}
                      >
                        <Share2 size={18} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.shareButton, styles.qrButton]}
                        onPress={() => showQRCode(selectedRoom)}
                      >
                        <QrCode size={18} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>QR Code</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Convidar como Convidado</Text>
                    <TouchableOpacity
                      style={styles.guestInviteButton}
                      onPress={() => inviteAsGuest(selectedRoom)}
                    >
                      <UserCircle size={18} color="#FFFFFF" />
                      <Text style={styles.shareButtonText}>Gerar Link Guest</Text>
                    </TouchableOpacity>
                    <Text style={styles.guestInviteHelp}>
                      Cria um link com credenciais encriptadas para acesso automático
                    </Text>
                  </View>
                </>
              )}

              {userRole === "admin" && (
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Estado da Sala (Admin)</Text>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>
                      {selectedRoom.isActive ? "Ativa" : "Inativa"}
                    </Text>
                    <Switch
                      value={selectedRoom.isActive}
                      onValueChange={() => toggleRoomStatus(selectedRoom.id)}
                      trackColor={{ false: "#C7C7CC", true: "#00D4FF" }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              )}

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Seu Papel na Sala</Text>
                <View style={styles.roleDisplay}>
                  {userRole === "admin" ? (
                    <>
                      <Shield size={20} color="#FFD700" />
                      <Text style={styles.roleText}>Administrador</Text>
                    </>
                  ) : (
                    <>
                      <UserCircle size={20} color="#00D4FF" />
                      <Text style={styles.roleText}>Convidado</Text>
                    </>
                  )}
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

              {userRole === "admin" && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setShowRoomSettings(false);
                    deleteRoom(selectedRoom.id);
                  }}
                >
                  <Text style={styles.deleteButtonText}>Eliminar Sala</Text>
                </TouchableOpacity>
              )}

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
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View>
          <Text style={styles.headerTitle}>🛡️ Chat do Partido</Text>
          <Text style={styles.headerSubtitle}>
            Comunicação segura e encriptada
          </Text>
        </View>
      </LinearGradient>

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
            <LinearGradient
              key={room.id}
              colors={["#0f3460", "#16213e"]}
              style={styles.roomCard}
            >
              <TouchableOpacity
                style={styles.roomCardTouchable}
                onPress={() => {
                  setRoomToJoin(room);
                  setShowJoinModal(true);
                }}
              >
              <LinearGradient
                colors={room.isPrivate ? ["#FF6B6B", "#E94E1B"] : ["#00D4FF", "#0099CC"]}
                style={styles.roomIcon}
              >
                {room.isPrivate ? (
                  <Lock size={24} color="#FFFFFF" />
                ) : (
                  <Unlock size={24} color="#FFFFFF" />
                )}
              </LinearGradient>
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
                    {room.isActive ? "Ativa" : "Inativa"} • {room.isPrivate ? "Privada" : "Pública"}
                  </Text>
                </View>
              </View>
              <View style={styles.roomKeyIcon}>
                <Key size={20} color="#00D4FF" />
              </View>
              </TouchableOpacity>
            </LinearGradient>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <LinearGradient
          colors={["#00D4FF", "#0099CC"]}
          style={styles.createButton}
        >
          <TouchableOpacity
            style={styles.createButtonTouchable}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Criar Nova Sala</Text>
          </TouchableOpacity>
        </LinearGradient>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={openScanner}
        >
          <CameraIcon size={24} color="#00D4FF" />
          <Text style={styles.scanButtonText}>Escanear QR</Text>
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModal}>
            <Text style={styles.qrTitle}>QR Code da Sala</Text>
            <Text style={styles.qrSubtitle}>Escaneie para entrar automaticamente</Text>
            
            <View style={styles.qrContainer}>
              {qrImageUrl ? (
                <Image
                  source={{ uri: qrImageUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <QrCode size={200} color="#00D4FF" />
                  <Text style={styles.qrPlaceholderText}>Gerando QR Code...</Text>
                </View>
              )}
            </View>

            <View style={styles.qrInfo}>
              <Text style={styles.qrInfoLabel}>Código Manual:</Text>
              <View style={styles.qrCodeDisplay}>
                <Text style={styles.qrCodeText}>{qrCodeData.length > 0 ? JSON.parse(qrCodeData).key : ""}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (qrCodeData) {
                      const data = JSON.parse(qrCodeData);
                      await Clipboard.setStringAsync(data.key);
                      Alert.alert("Copiado", "Código copiado!");
                    }
                  }}
                >
                  <Copy size={20} color="#00D4FF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.qrInstructions}>
              <Text style={styles.qrInstructionsText}>💡 Escaneie este QR Code com a câmera da app para entrar automaticamente na sala</Text>
            </View>

            <TouchableOpacity
              style={styles.qrCloseButton}
              onPress={() => setShowQRModal(false)}
            >
              <Text style={styles.qrCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Escanear QR Code</Text>
            <TouchableOpacity
              style={styles.scannerCloseButton}
              onPress={() => setShowScanner(false)}
            >
              <X size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerText}>Posicione o QR Code dentro do quadrado</Text>
            </View>
          </CameraView>
        </View>
      </Modal>

      <Modal
        visible={showGuestInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.guestInviteModal}>
            <View style={styles.guestInviteHeader}>
              <Shield size={32} color="#00D4FF" />
              <Text style={styles.guestInviteTitle}>Link de Convidado</Text>
            </View>
            
            <Text style={styles.guestInviteSubtitle}>
              Este link contém credenciais encriptadas que permitem acesso automático à sala como convidado.
            </Text>

            <View style={styles.guestLinkContainer}>
              <Text style={styles.guestLinkLabel}>🔐 Link Encriptado:</Text>
              <View style={styles.guestLinkBox}>
                <Text style={styles.guestLinkText} numberOfLines={3}>
                  {guestInviteLink}
                </Text>
              </View>
            </View>

            <View style={styles.guestInviteActions}>
              <TouchableOpacity
                style={styles.guestCopyButton}
                onPress={async () => {
                  await Clipboard.setStringAsync(guestInviteLink);
                  Alert.alert("Copiado!", "Link copiado para a área de transferência.");
                }}
              >
                <Copy size={18} color="#FFFFFF" />
                <Text style={styles.guestCopyButtonText}>Copiar Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.guestShareButton}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `🔐 Link de acesso à sala (Convidado):\n\n${guestInviteLink}\n\nClique no link para entrar automaticamente.`,
                      title: "Convite para Sala",
                    });
                  } catch (error) {
                    console.error("Share error:", error);
                  }
                }}
              >
                <Share2 size={18} color="#FFFFFF" />
                <Text style={styles.guestShareButtonText}>Partilhar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guestSecurityInfo}>
              <Text style={styles.guestSecurityText}>
                ✓ Credenciais encriptadas{"\n"}
                ✓ Acesso automático como convidado{"\n"}
                ✓ Sem necessidade de chave manual
              </Text>
            </View>

            <TouchableOpacity
              style={styles.guestCloseButton}
              onPress={() => setShowGuestInviteModal(false)}
            >
              <Text style={styles.guestCloseButtonText}>Fechar</Text>
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
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  roomsList: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0f0f23",
  },
  emptyRooms: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyRoomsTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyRoomsSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  roomCardTouchable: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  roomCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    color: "#FFFFFF",
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
    color: "#00D4FF",
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
  bottomButtons: {
    padding: 16,
    gap: 12,
  },
  createButton: {
    borderRadius: 16,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#00D4FF",
    gap: 8,
  },
  scanButtonText: {
    color: "#00D4FF",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  createButtonTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 8,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700" as const,
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 17,
    color: "#00D4FF",
    fontWeight: "600" as const,
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
    color: "#FFFFFF",
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
    color: "#00D4FF",
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
    color: "#FFFFFF",
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
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  deleteMessageButton: {
    padding: 4,
    opacity: 0.7,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessageBubble: {
    backgroundColor: "#00D4FF",
    alignSelf: "flex-end",
  },
  otherMessageBubble: {
    backgroundColor: "#1e1e3f",
    alignSelf: "flex-start",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  messageUsername: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  myMessageUsername: {
    color: "#0f0f23",
  },
  messageText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 22,
    marginBottom: 4,
  },
  myMessageText: {
    color: "#0f0f23",
  },
  messageTime: {
    fontSize: 11,
    color: "#B0B0B0",
    alignSelf: "flex-end",
  },
  myMessageTime: {
    color: "rgba(15, 15, 35, 0.6)",
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
  shareButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  shareButton: {
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  qrButton: {
    backgroundColor: "#00D4FF",
  },
  shareButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  roleDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F5F7",
    padding: 14,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#000000",
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
  qrModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#000000",
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 24,
  },
  qrContainer: {
    backgroundColor: "#F5F5F7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  qrImage: {
    width: 280,
    height: 280,
  },
  qrPlaceholder: {
    width: 280,
    height: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00D4FF",
    borderStyle: "dashed",
  },
  qrPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#00D4FF",
    fontWeight: "600" as const,
  },
  qrInstructions: {
    backgroundColor: "#E8F8FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrInstructionsText: {
    fontSize: 13,
    color: "#0099CC",
    textAlign: "center",
    lineHeight: 18,
  },
  qrInfo: {
    width: "100%",
    marginBottom: 20,
  },
  qrInfoLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 8,
  },
  qrCodeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#00D4FF",
    flex: 1,
  },
  qrCloseButton: {
    backgroundColor: "#00D4FF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  qrCloseText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  scannerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  scannerCloseButton: {
    padding: 8,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#00D4FF",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scannerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
    marginTop: 30,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  guestInviteButton: {
    backgroundColor: "#00D4FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  guestInviteHelp: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 8,
    lineHeight: 16,
  },
  guestInviteModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  guestInviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  guestInviteTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#000000",
  },
  guestInviteSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 24,
    lineHeight: 20,
  },
  guestLinkContainer: {
    marginBottom: 20,
  },
  guestLinkLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 8,
  },
  guestLinkBox: {
    backgroundColor: "#F5F5F7",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#00D4FF",
  },
  guestLinkText: {
    fontSize: 12,
    color: "#00D4FF",
    fontWeight: "500" as const,
    lineHeight: 16,
  },
  guestInviteActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  guestCopyButton: {
    flex: 1,
    backgroundColor: "#00D4FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  guestCopyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  guestShareButton: {
    flex: 1,
    backgroundColor: "#E94E1B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  guestShareButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  guestSecurityInfo: {
    backgroundColor: "#E8F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  guestSecurityText: {
    fontSize: 13,
    color: "#0099CC",
    lineHeight: 20,
  },
  guestCloseButton: {
    backgroundColor: "#F5F5F7",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  guestCloseButtonText: {
    color: "#8E8E93",
    fontSize: 17,
    fontWeight: "600" as const,
  },
});
