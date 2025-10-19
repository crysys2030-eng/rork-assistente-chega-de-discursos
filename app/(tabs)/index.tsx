import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ExternalLink, Clock } from "lucide-react-native";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

async function fetchSapoNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://noticias.sapo.pt/rss/ultimahora");
    const text = await response.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = text.matchAll(itemRegex);

    for (const match of matches) {
      const itemContent = match[1];
      const titleMatch = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = itemContent.match(
        /<description><!\[CDATA\[(.*?)\]\]><\/description>/
      );

      if (titleMatch && linkMatch && pubDateMatch) {
        items.push({
          title: titleMatch[1],
          link: linkMatch[1],
          pubDate: pubDateMatch[1],
          description: descMatch ? descMatch[1] : undefined,
        });
      }
    }

    return items;
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;

    return date.toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export default function NewsScreen() {
  const { data: news, isLoading, error, refetch } = useQuery({
    queryKey: ["sapo-news"],
    queryFn: fetchSapoNews,
    refetchInterval: 300000,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Últimas Notícias</Text>
        <Text style={styles.headerSubtitle}>Sapo.pt</Text>
      </View>

      {isLoading && !news ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#E94E1B" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Erro ao carregar notícias</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E94E1B"
            />
          }
        >
          <View style={styles.newsList}>
            {news?.map((item, index) => (
              <TouchableOpacity
                key={`${item.link}-${index}`}
                style={styles.newsCard}
                onPress={() => openLink(item.link)}
                activeOpacity={0.7}
              >
                <View style={styles.newsContent}>
                  <Text style={styles.newsTitle} numberOfLines={3}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={styles.newsDescription} numberOfLines={2}>
                      {item.description.replace(/<[^>]*>/g, "")}
                    </Text>
                  )}
                  <View style={styles.newsFooter}>
                    <View style={styles.timeContainer}>
                      <Clock size={14} color="#8E8E93" />
                      <Text style={styles.newsTime}>
                        {formatDate(item.pubDate)}
                      </Text>
                    </View>
                    <ExternalLink size={14} color="#E94E1B" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
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
    color: "#E94E1B",
    fontWeight: "600" as const,
  },
  scrollView: {
    flex: 1,
  },
  newsList: {
    padding: 16,
    gap: 12,
  },
  newsCard: {
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
  newsContent: {
    gap: 8,
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#000000",
    lineHeight: 24,
  },
  newsDescription: {
    fontSize: 15,
    color: "#8E8E93",
    lineHeight: 20,
  },
  newsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newsTime: {
    fontSize: 13,
    color: "#8E8E93",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  retryButton: {
    backgroundColor: "#E94E1B",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});
