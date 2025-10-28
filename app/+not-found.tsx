import { Stack, Link } from "expo-router";
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

export default function NotFoundScreen() {
  return (
    <View style={styles.container} testID="notFound-screen">
      <Stack.Screen options={{ title: "Página não encontrada" }} />
      <Text style={styles.title}>404</Text>
      <Text style={styles.subtitle}>Página não encontrada</Text>
      <Link href="/" asChild>
        <TouchableOpacity style={styles.button} testID="notFound-goHome">
          <Text style={styles.buttonText}>Ir para a agenda</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0f23",
    padding: 24,
  },
  title: {
    fontSize: 64,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#8E8E93",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#00D4FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#000",
    fontWeight: "700" as const,
    fontSize: 16,
  },
});
