import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { FlatList, KeyboardAvoidingView, ListRenderItemInfo, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Send, MessageSquareMore } from 'lucide-react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
}

const initialMessages: ChatMessage[] = [
  { id: 'welcome-1', role: 'assistant', text: 'Olá! Este é o chat. Escreva uma mensagem abaixo.', createdAt: Date.now() - 10000 },
];

const MessageItem = memo(({ item }: { item: ChatMessage }) => {
  const isUser = item.role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.assistantBubble;
  const textStyle = isUser ? styles.userText : styles.assistantText;

  return (
    <View style={[styles.messageRow, isUser ? styles.alignEnd : styles.alignStart]} testID={`message-${item.id}`}>
      <View style={[styles.bubble, containerStyle]}>
        <Text style={textStyle}>{item.text}</Text>
      </View>
    </View>
  );
});

MessageItem.displayName = 'MessageItem';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState<string>('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const data = useMemo(() => messages.slice().sort((a, b) => a.createdAt - b.createdAt), [messages]);

  const handleSend = useCallback(() => {
    try {
      const trimmed = input.trim();
      if (!trimmed) return;

      const newMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        text: trimmed,
        createdAt: Date.now(),
      };

      const echoMsg: ChatMessage = {
        id: `echo-${Date.now() + 1}`,
        role: 'assistant',
        text: 'Recebido: ' + trimmed,
        createdAt: Date.now() + 1,
      };

      setMessages(prev => {
        const next = [...prev, newMsg, echoMsg];
        return next;
      });

      setInput('');

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    } catch (e) {
      console.log('handleSend error', e);
    }
  }, [input]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => {
    return <MessageItem item={item} />;
  }, []);

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="chat-screen">
      <Stack.Screen
        options={{
          title: 'Chat',
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerRight: () => (
            <View style={styles.headerRight}>
              <MessageSquareMore size={22} color="#0f172a" />
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 76, android: 0, default: 0 }) ?? 0}
      >
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          testID="chat-list"
        />

        <View style={styles.inputRow} testID="chat-input-row">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Digite sua mensagem"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            testID="chat-text-input"
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleSend}
            style={styles.sendBtn}
            testID="chat-send-btn"
          >
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  headerRight: { paddingRight: 12 },
  listContent: { paddingHorizontal: 12, paddingVertical: 16 },
  messageRow: { width: '100%', marginVertical: 6 },
  alignStart: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  userBubble: { backgroundColor: '#2563eb' },
  assistantBubble: { backgroundColor: '#e2e8f0' },
  userText: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
  assistantText: { color: '#0f172a', fontSize: 16, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 12, color: '#0f172a', fontSize: 16 },
  sendBtn: { height: 44, width: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0ea5e9' },
});
