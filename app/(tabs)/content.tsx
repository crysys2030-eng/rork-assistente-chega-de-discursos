import { Stack } from "expo-router";
import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, Newspaper, PlayCircle, ExternalLink } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContentItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  cta: string;
  url: string;
  icon: "article" | "video" | "guide";
}

const items: ContentItem[] = [
  {
    id: "1",
    title: "Manifesto e Valores",
    description: "Conheça os princípios, objetivos e propostas-chave.",
    imageUrl:
      "https://images.unsplash.com/photo-1514959769115-6f09e0eb0b34?q=80&w=1200&auto=format&fit=crop",
    cta: "Ler manifesto",
    url: "https://chega.pt/manifesto",
    icon: "guide",
  },
  {
    id: "2",
    title: "Últimas Notícias",
    description: "Atualizações, comunicados e aparições na imprensa.",
    imageUrl:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1200&auto=format&fit=crop",
    cta: "Ver notícias",
    url: "https://chega.pt/noticias",
    icon: "article",
  },
  {
    id: "3",
    title: "Clipes e Discursos",
    description: "Veja momentos marcantes e trechos de discursos.",
    imageUrl:
      "https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?q=80&w=1200&auto=format&fit=crop",
    cta: "Assistir vídeos",
    url: "https://www.youtube.com/results?search_query=chega",
    icon: "video",
  },
];

export default function ContentScreen() {
  const openLink = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Não foi possível abrir o link.");
      }
    } catch (e) {
      console.error("openLink error", e);
      Alert.alert("Erro", "Ocorreu um erro ao abrir o link.");
    }
  }, []);

  const renderIcon = (type: ContentItem["icon"]) => {
    switch (type) {
      case "guide":
        return <BookOpen size={18} color="#FFFFFF" />;
      case "video":
        return <PlayCircle size={18} color="#FFFFFF" />;
      default:
        return <Newspaper size={18} color="#FFFFFF" />;
    }
  };

  return (
    <View style={styles.container} testID="content-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <Text style={styles.headerTitle}>Conteúdos</Text>
          <Text style={styles.headerSubtitle}>Artigos, vídeos e guias</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {items.map((item) => (
          <LinearGradient
            key={item.id}
            colors={["#0f3460", "#16213e"]}
            style={styles.card}
          >
            <TouchableOpacity
              testID={`content-card-${item.id}`}
              activeOpacity={0.85}
              style={styles.cardInner}
              onPress={() => openLink(item.url)}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />

              <View style={styles.cardBody}>
                <View style={styles.badge}>{renderIcon(item.icon)}</View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>

                <View style={styles.ctaRow}>
                  <Text style={styles.ctaText}>{item.cta}</Text>
                  <ExternalLink size={16} color="#00D4FF" />
                </View>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23" },
  header: { paddingBottom: 20 },
  safeArea: { paddingHorizontal: 20 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 15, color: "#00D4FF", fontWeight: "500" as const },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardInner: { flexDirection: "column" as const },
  cardImage: { width: "100%", height: 160 },
  cardBody: { padding: 14, gap: 8 },
  badge: {
    position: "absolute" as const,
    top: -18,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E94E1B",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "700" as const, color: "#FFFFFF" },
  cardDesc: { fontSize: 14, color: "#D1D1D6", lineHeight: 20 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  ctaText: { color: "#00D4FF", fontSize: 15, fontWeight: "600" as const },
});
