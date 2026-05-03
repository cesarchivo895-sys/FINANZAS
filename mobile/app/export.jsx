import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/context/ThemeContext';
import { exportApi } from '../src/services/api';
import { exportToCSV, shareCSV, shareSummary, generateReport } from '../src/utils/export';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function ExportScreen() {
  const { theme } = useTheme();
  const { colors, radius, spacing, typography } = theme;
  const router = useRouter();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const periods = [
    { key: 'daily', label: 'Hoy' },
    { key: 'monthly', label: 'Mes' },
    { key: 'yearly', label: 'Año' },
  ];

  useEffect(() => { loadReport(); }, [selectedPeriod]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await exportApi.getReport({ period: selectedPeriod });
      setReportData(response.data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareCSV = async () => {
    if (!reportData) return;
    await shareCSV(reportData.expenses);
  };

  const handleShareSummary = async () => {
    if (!reportData) return;
    await shareSummary(reportData.expenses, reportData.summary);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const { summary, categories, daily } = reportData || {};

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Period Selector */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.periodSelector}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, { backgroundColor: colors.surface }, selectedPeriod === p.key && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedPeriod(p.key)}
          >
            <Text style={[styles.periodText, { color: colors.textSecondary }, selectedPeriod === p.key && { color: '#FFFFFF', fontWeight: '600' }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Summary Card */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <Card variant="elevated">
          <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Resumen para Compartir</Text>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryItem, { backgroundColor: colors.expenseBg }]}>
              <Text style={[styles.summaryValue, { color: colors.expense }]}>${summary?.totalExpenses.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Gastos</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: colors.incomeBg }]}>
              <Text style={[styles.summaryValue, { color: colors.income }]}>${summary?.totalIncome.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ingresos</Text>
            </View>
            <View style={[styles.summaryItem, { backgroundColor: (summary?.balance >= 0 ? colors.incomeBg : colors.expenseBg) }]}>
              <Text style={[styles.summaryValue, { color: summary?.balance >= 0 ? colors.income : colors.expense }]}>${summary?.balance.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Export Actions */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <Card variant="outlined">
          <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Exportar</Text>

          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleShareCSV}>
            <Text style={styles.exportIcon}>📄</Text>
            <View>
              <Text style={[styles.exportButtonText, { color: '#FFFFFF' }]}>Exportar CSV</Text>
              <Text style={[styles.exportButtonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>Archivo completo con transacciones</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={handleShareSummary}>
            <Text style={styles.exportIcon}>📊</Text>
            <View>
              <Text style={[styles.exportButtonText, { color: '#FFFFFF' }]}>Compartir Resumen</Text>
              <Text style={[styles.exportButtonSubtext, { color: 'rgba(255,255,255,0.8)' }]}>Resumen breve con categorías principales</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </Animated.View>

      {/* Category Breakdown */}
      {categories?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).duration(300)}>
          <Card variant="outlined">
            <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Desglose por Categoría</Text>
            {categories.map((cat, i) => (
              <View key={i} style={[styles.categoryRow, i < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                <View style={styles.categoryInfo}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{cat.icon}</Text>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                </View>
                <View style={styles.categoryAmount}>
                  <Text style={[styles.categoryValue, { color: colors.text }]}>${cat.total.toFixed(2)}</Text>
                  <Text style={[styles.categoryPercent, { color: colors.textMuted }]}>{cat.count} trans.</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>
      )}

      {/* Daily Activity */}
      {daily?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(400).duration(300)}>
          <Card variant="outlined">
            <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Actividad Reciente</Text>
            {daily.slice(-7).reverse().map((day, i) => (
              <View key={i} style={[styles.dayRow, i < 6 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
                <Text style={[styles.dayDate, { color: colors.textSecondary }]}>{day.date}</Text>
                <Text style={[styles.dayIncome, { color: colors.income }]}>${day.income.toFixed(0)}</Text>
                <Text style={[styles.dayExpense, { color: colors.expense }]}>-${day.expenses.toFixed(0)}</Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  periodText: { fontSize: 14 },
  cardTitle: { marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  exportButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  exportIcon: { fontSize: 28, marginRight: 12 },
  exportButtonText: { fontSize: 16, fontWeight: '600' },
  exportButtonSubtext: { fontSize: 12, marginTop: 2 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center' },
  categoryName: { fontSize: 15, fontWeight: '500' },
  categoryAmount: { alignItems: 'flex-end' },
  categoryValue: { fontSize: 15, fontWeight: '600' },
  categoryPercent: { fontSize: 11, marginTop: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  dayDate: { flex: 1, fontSize: 14 },
  dayIncome: { fontSize: 14, fontWeight: '600' },
  dayExpense: { fontSize: 14, fontWeight: '600', width: 70, textAlign: 'right' },
});
