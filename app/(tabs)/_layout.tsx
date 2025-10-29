import { Tabs } from "expo-router";
import { Calendar, FileText, ListChecks, Megaphone, Globe2 } from "lucide-react-native";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E94E1B",
        tabBarInactiveTintColor: "#8E8E93",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5EA",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="minutes"
        options={{
          title: "Minutas",
          tabBarIcon: ({ color }) => <FileText color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="chega-tasks"
        options={{
          title: "Tarefas Chega",
          tabBarIcon: ({ color }) => <ListChecks color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="speech-ai"
        options={{
          title: "Discurso IA",
          tabBarIcon: ({ color }) => <Megaphone color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="ai-feed"
        options={{
          title: "AI Feed",
          tabBarIcon: ({ color }) => <Globe2 color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
