import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { budgetsApi } from '../src/services/api';
import {
  requestNotificationPermission,
  checkBudgetAlerts,
  scheduleDailyReminder,
  scheduleWeeklyReport,
  cancelAllNotifications,
} from '../src/services/notifications';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;

  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const granted = await requestNotificationPermission();
      setPermissionsGranted(granted);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBudgetAlerts = async (value) => {
    setBudgetAlerts(value);
    if (!value) {
      await cancelAllNotifications();
    } else {
      try {
        const { data } = await budgetsApi.getStatus();
        await checkBudgetAlerts(data);
      } catch (error) {
        console.error('Error scheduling budget alerts:', error);
      }
    }
  };

  const handleToggleDailyReminder = async (value) => {
    setDailyReminder(value);
    if (value) {
      try {
        await scheduleDailyReminder(20, 0);
        Alert.alert('✅', 'Recordatorio diario activado a las 8:00 PM');
      } catch (error) {
        Alert.alert('Error', 'No se pudo activar el recordatorio');
        setDailyReminder(false);
      }
    }
  };

  const handleToggleWeeklyReport = async (value) => {
    setWeeklyReport(value);
    if (value) {
      try {
        await scheduleWeeklyReport(0, 18);
        Alert.alert('✅', 'Resumen semanal activado para los domingos a las 6:00 PM');
      } catch (error) {
        Alert.alert('Error', 'No se pudo activar el resumen semanal');
        setWeeklyReport(false);
      }
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permissionsGranted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={[styles.permissionCard, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 64 }}>🔔</Text>
          <Text style={[typography.h3, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>Permisos Requeridos</Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
            Necesitamos permiso para enviarte notificaciones sobre tus presupuestos y recordatorios.
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={async () => {
              const granted = await requestNotificationPermission();
              setPermissionsGranted(granted);
            }}
          >
            <Text style={[styles.permissionButtonText, { color: '#FFFFFF' }]}>Activar Notificaciones</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const settings = [
    {
      icon: 'warning',
      iconColor: colors.warning,
      iconBg: colors.warningBg,
      title: 'Alertas de Presupuesto',
      description: 'Recibe alertas cuando tus presupuestos estén al 75%, 90% o se agoten',
      value: budgetAlerts,
      onToggle: handleToggleBudgetAlerts,
    },
    {
      icon: 'alarm',
      iconColor: colors.primary,
      iconBg: `${colors.primary}15`,
      title: 'Recordatorio Diario',
      description: 'Te recordaremos registrar tus gastos cada día a las 8:00 PM',
      value: dailyReminder,
      onToggle: handleToggleDailyReminder,
    },
    {
      icon: 'calendar',
      iconColor: colors.accent,
      iconBg: `${colors.accent}15`,
      title: 'Resumen Semanal',
      description: 'Recibe un resumen de tus finanzas cada domingo a las 6:00 PM',
      value: weeklyReport,
      onToggle: handleToggleWeeklyReport,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <Card variant="outlined">
          <Text style={[styles.sectionLabel, typography.label, { color: colors.textSecondary }]}>Notificaciones</Text>
          {settings.map((setting, i) => (
            <View
              key={setting.title}
              style={[styles.settingRow, i < settings.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
            >
              <View style={[styles.settingIcon, { backgroundColor: setting.iconBg }]}>
                <Ionicons name={setting.icon} size={22} color={setting.iconColor} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{setting.title}</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.value}
                onValueChange={setting.onToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </Card>
      </Animated.View>

      {budgetAlerts && (
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Card variant="elevated">
            <Text style={[styles.sectionLabel, typography.label, { color: colors.textSecondary }]}>Niveles de Alerta</Text>
            <View style={styles.alertLevels}>
              <View style={styles.alertLevel}>
                <View style={[styles.alertDot, { backgroundColor: colors.info }]} />
                <Text style={[styles.alertLevelText, { color: colors.textSecondary }]}>75% - Advertencia</Text>
              </View>
              <View style={styles.alertLevel}>
                <View style={[styles.alertDot, { backgroundColor: colors.warning }]} />
                <Text style={[styles.alertLevelText, { color: colors.textSecondary }]}>90% - Crítico</Text>
              </View>
              <View style={styles.alertLevel}>
                <View style={[styles.alertDot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.alertLevelText, { color: colors.textSecondary }]}>100% - Agotado</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  permissionCard: { margin: 20, padding: 30, borderRadius: 20, alignItems: 'center' },
  permissionButton: { marginTop: 20, padding: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  permissionButtonText: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  settingIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600' },
  settingDescription: { fontSize: 13, marginTop: 2 },
  alertLevels: { gap: 12 },
  alertLevel: { flexDirection: 'row', alignItems: 'center' },
  alertDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  alertLevelText: { fontSize: 14 },
});
