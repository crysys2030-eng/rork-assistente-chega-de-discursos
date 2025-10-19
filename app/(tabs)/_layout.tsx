import { Tabs } from "expo-router";
import { Calendar, MessageCircle, Mic, FileText, ListChecks } from "lucide-react-native";
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
        name="chat"
        options={{
          title: "AI Chat",
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="speech"
        options={{
          title: "Discursos",
          tabBarIcon: ({ color }) => <Mic color={color} size={24} />,
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
    </Tabs>
  );
}
