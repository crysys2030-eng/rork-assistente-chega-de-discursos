import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface ErrorBoundaryState { hasError: boolean; error?: Error | null }

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log("ErrorBoundary caught", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary">
          <Text style={styles.title}>Ocorreu um erro</Text>
          <Text style={styles.subtitle}>Tente novamente. Se persistir, reinicie a app.</Text>
          <TouchableOpacity onPress={this.handleReset} style={styles.button} testID="error-retry">
            <Text style={styles.buttonText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children as React.ReactNode;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f23", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" as const, marginBottom: 8 },
  subtitle: { color: "#8E8E93", fontSize: 14, textAlign: "center", marginBottom: 16 },
  button: { backgroundColor: "#E94E1B", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" as const },
});
