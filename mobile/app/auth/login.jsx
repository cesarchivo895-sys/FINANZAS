import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function LoginScreen() {
  const { login, continueAsGuest } = useApp();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>💰</Text>
          <Text style={[styles.title, typography.h1, { color: colors.text }]}>Finanzas</Text>
          <Text style={[styles.subtitle, typography.bodySmall, { color: colors.textSecondary }]}>Controla tus gastos familiares</Text>
        </View>
      </Animated.View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={[styles.form, { backgroundColor: colors.surface }]}>
        <Text style={[styles.formTitle, typography.h3, { color: colors.text }]}>Bienvenido</Text>

        {/* Email */}
        <View style={styles.field}>
          <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Email</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Contraseña</Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Iniciar Sesión</Text>}
        </TouchableOpacity>

        {/* Guest */}
        <TouchableOpacity
          style={[styles.guestButton, { borderColor: colors.border }]}
          onPress={async () => {
            setLoading(true);
            try {
              await continueAsGuest();
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'No se pudo continuar como invitado');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>Continuar como invitado</Text>
        </TouchableOpacity>

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Regístrate</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 20 },
  logoContainer: { alignItems: 'center' },
  logoEmoji: { fontSize: 72, marginBottom: 8 },
  title: { fontWeight: '800' },
  subtitle: { marginTop: 8 },
  form: { flex: 1, paddingHorizontal: 24, paddingTop: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  formTitle: { marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, height: 52 },
  input: { flex: 1, marginHorizontal: 10, fontSize: 16 },
  loginButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  loginButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  guestButton: { padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, marginTop: 12 },
  guestButtonText: { fontSize: 16, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  registerText: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700', marginLeft: 4 },
});
