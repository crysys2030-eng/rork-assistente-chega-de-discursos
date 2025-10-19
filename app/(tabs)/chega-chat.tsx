import { Stack } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Send, Trash2, Shield, Sparkles } from "lucide-react-native";

interface ChatMessagePartText {
  type: "text";
  text: string;
}

interface ChatMessagePartToolInput {
  type: "tool";
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  toolName: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  parts: (ChatMessagePartText | ChatMessagePartToolInput)[];
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const Fallback = useMemo(
    () => (
      <View style={styles.errorContainer} testID="error-fallback">
        <Shield color="#FF3B30" size={24} />
        <Text style={styles.errorTitle}>Ocorreu um erro</Text>
        <Text style={styles.errorSubtitle}>{errorMessage || "Tente novamente."}</Text>
      </View>
    ),
    [errorMessage]
  );

  try {
    if (hasError) return Fallback;
    return <>{children}</>;
  } catch (e) {
    console.error("Render error in ChegaChat:", e);
    setHasError(true);
    setErrorMessage((e as Error)?.message ?? "Erro desconhecido");
    return Fallback;
  }
}

function MessageBubble({ item }: { item: ChatMessageItem }) {
  const isUser = item.role === "user";
  return (
    <View
      style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
      testID={`message-${item.id}`}
    >
      {item.parts.map((part, idx) => {
        if (part.type === "text") {
          return (
            <Text key={`${item.id}-${idx}`} style={styles.bubbleText}>
              {part.text}
            </Text>
          );
        }
        return (
          <Text key={`${item.id}-${idx}`} style={styles.toolText}>
            {part.state === "output-error"
              ? `Erro da ferramenta: ${part.errorText ?? "desconhecido"}`
              : `Ferramenta ${part.toolName}: ${part.state}`}
          </Text>
        );
      })}
    </View>
  );
}

const MemoMessageBubble = memo(MessageBubble);

export default function ChegaChatScreen() {
  const [input, setInput] = useState<string>("");
  const listRef = useRef<FlatList<ChatMessageItem>>(null);

  const chegaNote = useMemo(
    () =>
      "Este chat é focado em Portugal e responde de acordo com as narrativas e posicionamentos oficiais do partido Chega, com base em fontes públicas.",
    []
  );

  const { messages, error, sendMessage, setMessages } = useRorkAgent({
    tools: {},
  });

  const data = (messages as unknown as ChatMessageItem[]) ?? [];

  const systemPrompt = useMemo(
    () =>
      "Respondes sempre em português de Portugal. Mantém-te estritamente alinhado com as narrativas, prioridades e comunicados oficiais do partido Chega. Quando a pergunta não for sobre Portugal ou não tiver relação com o contexto político e social português, pede para reformular para o contexto de Portugal. Baseia-te em informação pública; se não tiveres confiança suficiente, indica limitações com transparência e sugere fontes públicas. Evita opiniões pessoais não alinhadas e não fales em nome de outras entidades.",
    []
  );

  

  const onSend = useCallback(async () => {
    const value = input.trim();
    if (!value) return;
    try {
      console.log("ChegaChat: sending message", value);
      const composed = `Instruções: ${systemPrompt}\n\nPergunta: ${value}`;
      await sendMessage({ text: composed });
      setInput("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error("ChegaChat: send error", e);
      Alert.alert("Erro", "Não foi possível enviar a mensagem. Tente novamente.");
    }
  }, [input, sendMessage, systemPrompt]);

  const clearChat = useCallback(() => {
    try {
      setMessages([]);
    } catch (e) {
      console.error("ChegaChat: clear error", e);
    }
  }, [setMessages]);

  const insets = useSafeAreaInsets();

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <LinearGradient colors={["#1a1a2e", "#16213e"]} style={[styles.header, { paddingTop: insets.top + 12 }] }>
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <Text style={styles.title} testID="chat-title">Chat AI Chega</Text>
              <Text style={styles.subtitle} testID="chat-subtitle">Contexto Portugal • Alinhado com narrativas oficiais</Text>
            </View>
            <TouchableOpacity onPress={clearChat} style={styles.clearButton} testID="clear-chat">
              <Trash2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.noteBanner} testID="note-banner">
          <Text style={styles.noteBannerText}>{chegaNote}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner} testID="error-banner">
            <Text style={styles.errorBannerText}>Erro no chat. Tente novamente.</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <MemoMessageBubble item={item} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="empty-state">
              <Sparkles size={32} color="#00D4FF" />
              <Text style={styles.emptyTitle}>Comece a conversa</Text>
              <Text style={styles.emptySubtitle}>
                Faça perguntas sobre o programa, propostas ou comunicados do Chega.
              </Text>
            </View>
          }
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Escreva a sua pergunta..."
              placeholderTextColor="#8E8E93"
              returnKeyType="send"
              onSubmitEditing={onSend}
              testID="chat-input"
            />
            <TouchableOpacity onPress={onSend} style={styles.sendButton} testID="send-button">
              <LinearGradient colors={["#00D4FF", "#0099CC"]} style={styles.sendButtonInner}>
                <Send size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  errorContainer: { alignItems: "center", padding: 24 },
  errorTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" as const, marginTop: 8 },
  errorSubtitle: { color: "#8E8E93", fontSize: 13, textAlign: "center", marginTop: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitles: { flexDirection: "column" },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" as const },
  subtitle: { color: "#00D4FF", fontSize: 13, fontWeight: "500" as const, marginTop: 4 },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  noteBanner: {
    backgroundColor: "#0b2a3b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#123a55",
  },
  noteBannerText: { color: "#00D4FF", textAlign: "center", fontSize: 12 },
  errorBanner: {
    backgroundColor: "#3b0b0e",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  errorBannerText: { color: "#FF453A", textAlign: "center" },
  listContent: { padding: 12, gap: 10 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" as const, marginTop: 12 },
  emptySubtitle: { color: "#8E8E93", fontSize: 14, textAlign: "center", marginTop: 6 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14, marginVertical: 4 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: "#16324a", borderTopRightRadius: 4 },
  bubbleAssistant: { alignSelf: "flex-start", backgroundColor: "#1e2a44", borderTopLeftRadius: 4 },
  bubbleText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22 },
  toolText: { color: "#00D4FF", fontSize: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#0f1a2b",
    borderWidth: 1,
    borderColor: "#23324a",
    color: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  sendButton: {},
  sendButtonInner: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
});
