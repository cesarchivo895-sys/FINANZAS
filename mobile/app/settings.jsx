import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { expensesApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user, logout } = useApp();
  const { theme, themeMode, setThemeMode, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;

  const handleSync = async () => {
    try {
      const result = await expensesApi.sync();
      Alert.alert('Sincronización', `Sincronizados: ${result.synced}, Fallidos: ${result.failed}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo sincronizar');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar' },
      { text: 'Cerrar', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth/login');
      }},
    ]);
  };

  const themeOptions = [
    { key: 'auto', icon: 'desktop-outline', label: 'Automático' },
    { key: 'light', icon: 'sunny-outline', label: 'Claro' },
    { key: 'dark', icon: 'moon-outline', label: 'Oscuro' },
  ];

  const menuItems = [
    { icon: 'wallet-outline', label: 'Metas de Ahorro', action: () => router.push('/savings-goals') },
    { icon: 'notifications', label: 'Notificaciones', action: () => router.push('/notification-settings') },
    { icon: 'download-outline', label: 'Exportar datos', action: () => router.push('/export') },
    { icon: 'sync', label: 'Sincronizar datos', action: handleSync },
    { icon: 'help-circle', label: 'Ayuda y soporte', action: () => Alert.alert('Ayuda', 'Contacta a soporte@finanzasfamilia.com') },
    { icon: 'information-circle', label: 'Acerca de', action: () => Alert.alert('Finanzas Familia', 'v1.0.0\nAplicación de control de gastos familiares') },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card variant="elevated">
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, typography.h3, { color: colors.text }]}>{user?.name}</Text>
              <Text style={[styles.profileEmail, typography.bodySmall, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Theme */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <Card variant="outlined">
          <Text style={[styles.sectionLabel, typography.label, { color: colors.textSecondary }]}>Apariencia</Text>
          <View style={styles.themeOptions}>
            {themeOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.themeOption, { backgroundColor: colors.background }, themeMode === opt.key && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}
                onPress={() => setThemeMode(opt.key)}
              >
                <Ionicons name={opt.icon} size={24} color={themeMode === opt.key ? colors.primary : colors.textMuted} />
                <Text style={[styles.themeOptionText, { color: colors.textSecondary }, themeMode === opt.key && { color: colors.primary, fontWeight: '600' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </Animated.View>

      {/* Settings */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <Card variant="outlined">
          <Text style={[styles.sectionLabel, typography.label, { color: colors.textSecondary }]}>General</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
              onPress={item.action}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
                <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.delay(300).duration(300)}>
        <TouchableOpacity style={[styles.logoutButton, { borderColor: colors.danger }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  profileInfo: { marginLeft: 16 },
  profileName: {},
  profileEmail: {},
  sectionLabel: { marginBottom: 12 },
  themeOptions: { flexDirection: 'row', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  themeOptionText: { fontSize: 13, marginTop: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { fontSize: 16, marginLeft: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 40 },
  logoutText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
