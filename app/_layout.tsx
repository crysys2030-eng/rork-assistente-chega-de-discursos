import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Voltar" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function EnableBackendFAB() {
  const [visible, setVisible] = useState<boolean>(true);

  const onPress = useCallback(() => {
    const title = "Ativar Backend (IA)";
    const message = Platform.select({
      web:
        "Para ativar a IA neste deploy, clique em 'Backend' no topo da interface e ative-o. Depois refaça o deploy para Vercel.",
      default:
        "Ative a IA no ambiente web clicando em 'Backend' no topo do editor. Em seguida, volte à app e tente novamente.",
    });
    Alert.alert(title, message ?? "Ative 'Backend' no topo e refaça o deploy.");
  }, []);

  const label = useMemo(() => "Ativar IA", []);

  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={styles.fabWrapper}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={() => setVisible(false)}
        activeOpacity={0.9}
        style={styles.fabTouchable}
        testID="enable-backend-button"
        accessibilityLabel="Ativar Backend para IA"
      >
        <LinearGradient colors={["#00D4FF", "#0099CC"]} style={styles.fab}>
          <Sparkles size={18} color="#FFFFFF" />
          <Text style={styles.fabText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
        <EnableBackendFAB />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  fabTouchable: {
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    borderRadius: 24,
    overflow: "hidden",
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
