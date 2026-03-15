/**
 * Tab layout — floating glass tab bar with neon-green active indicators.
 * Minimal icons, no labels on inactive tabs, subtle glow on active.
 */

import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useAuthStore } from '@/stores/authStore';
import { theme } from '@/constants/theme';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} color={color} size={22} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.green.primary,
        tabBarInactiveTintColor: theme.colors.ui.inactiveIcon,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarShowLabel: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: theme.colors.text.primary,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={logout} hitSlop={8}>
                {({ pressed }) => (
                  <Text style={[styles.logoutText, pressed && styles.pressed]}>
                    Log out
                  </Text>
                )}
              </Pressable>
              <Link href="/modal" asChild>
                <Pressable hitSlop={8}>
                  {({ pressed }) => (
                    <Ionicons
                      name="information-circle"
                      size={22}
                      color={theme.colors.text.secondary}
                      style={pressed ? styles.pressed : undefined}
                    />
                  )}
                </Pressable>
              </Link>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="two" options={{ href: null }} />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="nutrition" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubbles" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="health-upload"
        options={{
          title: 'Fitness',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="pulse" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="barbell" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="nutrition.mock" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}


const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 64,
    borderRadius: theme.radius.xl,
    backgroundColor: 'rgba(20,25,22,0.92)',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(57,255,136,0.12)',
    paddingBottom: 0,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 12,
  },
  tabItem: {
    marginHorizontal: 2,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
  },
  tabLabel: {
    display: 'none',
  },
  header: {
    backgroundColor: theme.colors.background.main,
    shadowOpacity: 0,
    elevation: 0,
    borderBottomWidth: 0,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontWeight: '700',
    fontSize: 17,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 16,
  },
  logoutText: {
    color: theme.colors.green.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.5,
  },

  /* Tab icon */
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(57,255,136,0.12)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.green.primary,
    marginTop: 3,
  },
});
