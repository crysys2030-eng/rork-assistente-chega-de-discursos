import { Tabs } from "expo-router";
import { Calendar, FileText, ListChecks, MessageCircle, TrendingUp, Scale } from "lucide-react-native";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#8E8E93",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          // keep default height for safe areas
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="chega-tasks"
        options={{
          title: "Tarefas",
          tabBarIcon: ({ color }) => <ListChecks color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="propostas"
        options={{
          title: "Propostas",
          tabBarIcon: ({ color }) => <Scale color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) => <Calendar color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="minutes"
        options={{
          title: "Minutas",
          tabBarIcon: ({ color }) => <FileText color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="respostas"
        options={{
          title: "Media",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={20} />,
        }}
      />
      <Tabs.Screen
        name="analise"
        options={{
          title: "Opinião",
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={20} />,
        }}
      />
    </Tabs>
  );
}
