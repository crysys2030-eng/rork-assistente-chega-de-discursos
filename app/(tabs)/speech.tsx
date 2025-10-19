import { generateText } from "@rork/toolkit-sdk";
import { Stack } from "expo-router";
import { Sparkles, Loader2, Copy, Check } from "lucide-react-native";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

interface SpeechFormData {
  topic: string;
  tone: "formal" | "informal" | "inspiracional";
  duration: string;
  audience: string;
}

export default function SpeechScreen() {
  const [formData, setFormData] = useState<SpeechFormData>({
    topic: "",
    tone: "formal",
    duration: "5",
    audience: "",
  });

  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      Alert.alert("Erro", "Por favor, insira o tema do discurso.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Crie um discurso em português com as seguintes características:
      
Tema: ${formData.topic}
Tom: ${formData.tone}
Duração estimada: ${formData.duration} minutos
Audiência: ${formData.audience || "Geral"}

O discurso deve:
- Ter uma introdução cativante
- Desenvolver bem os pontos principais
- Incluir exemplos ou histórias quando apropriado
- Ter uma conclusão impactante
- Ser adequado para a duração e tom especificados
- Usar linguagem adequada para a audiência

Não inclua títulos ou metadados, apenas o texto do discurso pronto a ser lido.`;

      const speech = await generateText(prompt);
      setGeneratedSpeech(speech);
    } catch (error) {
      console.error("Error generating speech:", error);
      Alert.alert("Erro", "Não foi possível gerar o discurso. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(generatedSpeech);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Preparação de Discursos</Text>
        <Text style={styles.headerSubtitle}>Crie discursos com IA</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={styles.label}>Tema do Discurso *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.topic}
                onChangeText={(text) =>
                  setFormData({ ...formData, topic: text })
                }
                placeholder="Ex: Importância da inovação tecnológica"
                placeholderTextColor="#8E8E93"
                multiline
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Tom do Discurso</Text>
              <View style={styles.toneButtons}>
                {(["formal", "informal", "inspiracional"] as const).map(
                  (tone) => (
                    <TouchableOpacity
                      key={tone}
                      style={[
                        styles.toneButton,
                        formData.tone === tone && styles.toneButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, tone })}
                    >
                      <Text
                        style={[
                          styles.toneButtonText,
                          formData.tone === tone &&
                            styles.toneButtonTextActive,
                        ]}
                      >
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Duração (minutos)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.duration}
                onChangeText={(text) =>
                  setFormData({ ...formData, duration: text })
                }
                placeholder="5"
                placeholderTextColor="#8E8E93"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Audiência (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.audience}
                onChangeText={(text) =>
                  setFormData({ ...formData, audience: text })
                }
                placeholder="Ex: Empresários, estudantes, público geral"
                placeholderTextColor="#8E8E93"
              />
            </View>

            <TouchableOpacity
              style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>A gerar...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Gerar Discurso</Text>
                </>
              )}
            </TouchableOpacity>

            {generatedSpeech ? (
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>Discurso Gerado</Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={handleCopy}
                  >
                    {copied ? (
                      <Check size={20} color="#34C759" />
                    ) : (
                      <Copy size={20} color="#E94E1B" />
                    )}
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.speechContainer}>
                  <Text style={styles.speechText}>{generatedSpeech}</Text>
                </ScrollView>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
    gap: 20,
  },
  formSection: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    minHeight: 50,
  },
  toneButtons: {
    flexDirection: "row",
    gap: 8,
  },
  toneButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  toneButtonActive: {
    backgroundColor: "#E94E1B",
    borderColor: "#E94E1B",
  },
  toneButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#000000",
  },
  toneButtonTextActive: {
    color: "#FFFFFF",
  },
  generateButton: {
    backgroundColor: "#E94E1B",
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600" as const,
  },
  resultContainer: {
    marginTop: 8,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#000000",
  },
  copyButton: {
    padding: 8,
  },
  speechContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  speechText: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 24,
  },
});
