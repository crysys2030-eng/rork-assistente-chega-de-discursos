import { useRorkAgent } from "@rork/toolkit-sdk";
import { Stack } from "expo-router";
import { Send, Loader2, Sparkles } from "lucide-react-native";
import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

export default function ChatScreen() {
  const [input, setInput] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const { messages, error, sendMessage } = useRorkAgent({
    tools: {},
  });



  const handleSend = () => {
    const lastMessage = messages[messages.length - 1];
    const streaming = lastMessage?.role === "assistant" && lastMessage?.parts.length === 0;
    
    if (input.trim() && !streaming) {
      sendMessage(input);
      setInput("");
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#1a1a2e", "#16213e"]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.headerContent}>
          <Sparkles size={28} color="#00D4FF" />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Chat</Text>
            <Text style={styles.headerSubtitle}>Assistente inteligente</Text>
          </View>
        </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Sparkles size={64} color="#00D4FF" />
              <Text style={styles.emptyTitle}>Olá! 👋</Text>
              <Text style={styles.emptySubtitle}>
                Faça qualquer pergunta e eu ajudo-o com a resposta.
              </Text>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id} style={styles.messageWrapper}>
                {m.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <View
                        key={`${m.id}-${i}`}
                        style={[
                          styles.messageBubble,
                          m.role === "user"
                            ? styles.userBubble
                            : styles.assistantBubble,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            m.role === "user"
                              ? styles.userText
                              : styles.assistantText,
                          ]}
                        >
                          {part.text}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            ))
          )}
          {messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.parts.length === 0 && (
            <View style={styles.loadingContainer}>
              <Loader2 size={20} color="#00D4FF" />
              <Text style={styles.loadingText}>A pensar...</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Erro: {error.message}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escreva a sua pergunta..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={1000}
            editable={true}
          />
          <LinearGradient
            colors={!input.trim() ? ["#C7C7CC", "#8E8E93"] : ["#00D4FF", "#0099CC"]}
            style={styles.sendButton}
          >
            <TouchableOpacity
              style={styles.sendButtonInner}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    alignItems: "center",
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
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
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 32,
    marginBottom: 12,
    color: "#FFFFFF",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 17,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#00D4FF",
    alignSelf: "flex-end",
    marginLeft: "20%",
  },
  assistantBubble: {
    backgroundColor: "#1e1e3f",
    alignSelf: "flex-start",
    marginRight: "20%",
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#0f0f23",
  },
  assistantText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1e1e3f",
    alignSelf: "flex-start",
    borderRadius: 20,
    marginRight: "20%",
  },
  loadingText: {
    fontSize: 15,
    color: "#00D4FF",
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
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
    borderRadius: 22,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonInner: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
