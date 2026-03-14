/**
 * LoginScreen — cyber-wellness aesthetic with mesh gradient background,
 * floating-label inputs with neon glow, and animated CTA.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';
import { theme } from '@/constants/theme';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { GlowInput } from '@/components/ui/GlowInput';
import { NeonButton } from '@/components/ui/NeonButton';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail =
          typeof err.response?.data?.detail === 'string'
            ? err.response.data.detail
            : null;
        if (detail) {
          setError(detail);
        } else if (err.code === 'ECONNABORTED' || !err.response) {
          setError('Cannot reach server. Check your connection and try again.');
        } else {
          setError('Login failed. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MeshBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header ── */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
            <View style={styles.logoRing}>
              <View style={styles.logoInner}>
                <Text style={styles.logoGlyph}>⬡</Text>
              </View>
            </View>
            <Text style={styles.brand}>Health OS</Text>
            <Text style={styles.tagline}>Your personal wellness engine</Text>
          </Animated.View>

          {/* ── Form ── */}
          <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.form}>
            <Text style={styles.formTitle}>Welcome back</Text>

            {error !== '' && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <GlowInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />

            <GlowInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <NeonButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
            />
          </Animated.View>

          {/* ── Footer ── */}
          <Animated.View entering={FadeInDown.duration(600).delay(400)}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={styles.footer}
              accessibilityRole="link"
            >
              <Text style={styles.footerText}>
                No account yet?{' '}
                <Text style={styles.footerAccent}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MeshBackground>
  );
}


const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
  },

  /* Brand */
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(57,255,136,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.glow.subtle,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(57,255,136,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlyph: {
    fontSize: 28,
    color: theme.colors.green.primary,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.green.primary,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  /* Form */
  form: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },

  /* Error */
  errorBanner: {
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderRadius: theme.radius.sm,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.25)',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    lineHeight: 18,
  },

  /* Footer */
  footer: {
    marginTop: 28,
    alignItems: 'center',
  },
  footerText: {
    color: theme.colors.text.muted,
    fontSize: 14,
  },
  footerAccent: {
    color: theme.colors.green.primary,
    fontWeight: '600',
  },
});
