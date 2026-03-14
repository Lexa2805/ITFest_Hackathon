import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuthStore } from '@/stores/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = (colorScheme ?? 'dark') === 'light' ? 'dark' : (colorScheme ?? 'dark');
  const logout = useAuthStore((state) => state.logout);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tint,
        tabBarInactiveTintColor: Colors[theme].tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 10,
          borderRadius: 20,
          height: 72,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderColor: 'rgba(242,166,90,0.28)',
          backgroundColor: '#14131D',
          shadowColor: '#000000',
          shadowOpacity: 0.45,
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 24,
          elevation: 10,
        },
        tabBarItemStyle: {
          marginHorizontal: 4,
          borderRadius: 14,
        },
        tabBarActiveBackgroundColor: 'rgba(242,166,90,0.16)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: -2,
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" color={color} size={24} />
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 }}>
              <Pressable onPress={logout}>
                {({ pressed }) => (
                  <Text
                    style={{
                      color: Colors[theme].tint,
                      fontSize: 15,
                      fontWeight: '600',
                      opacity: pressed ? 0.5 : 1,
                    }}>
                    Log out
                  </Text>
                )}
              </Pressable>
              <Link href="/modal" asChild>
                <Pressable>
                  {({ pressed }) => (
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color={Colors[theme].text}
                      style={{ opacity: pressed ? 0.5 : 1 }}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => (
            <Ionicons name="nutrition" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" color={color} size={24} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="health-upload"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color }) => (
            <Ionicons name="pulse" color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition.mock"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
