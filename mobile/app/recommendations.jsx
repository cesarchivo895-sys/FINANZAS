import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { recommendationsApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function RecommendationsScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const { colors, radius, spacing, typography } = theme;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    try {
      const response = await recommendationsApi.getAll();
      setData(response.data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const getRecommendationStyle = (type) => {
    const config = {
      critical: { bg: colors.dangerBg, border: colors.danger, icon: 'close-circle' },
      warning: { bg: colors.warningBg, border: colors.warning, icon: 'warning' },
      info: { bg: colors.infoBg, border: colors.info, icon: 'information-circle' },
    };
    return config[type] || config.info;
  };

  const tips = [
    { icon: '💡', text: 'Regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro' },
    { icon: '📊', text: 'Revisa tus gastos semanalmente para mantenerte al día' },
    { icon: '🎯', text: 'Establece metas de ahorro específicas y realistas' },
    { icon: '🚫', text: 'Evita compras impulsivas esperando 24 horas antes de decidir' },
    { icon: '💳', text: 'Usa presupuestos por categoría para controlar mejor tus gastos' },
    { icon: '🏦', text: 'Automatiza tus ahorros transfiriendo una parte fija cada mes' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary */}
      {data?.summary && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card variant="elevated">
            <Text style={[styles.sectionTitle, typography.h3, { color: colors.text }]}>Resumen del Mes</Text>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryItem, { backgroundColor: colors.expenseBg }]}>
                <Text style={[styles.summaryItemValue, { color: colors.expense }]}>${data.summary.currentMonthExpenses.toFixed(0)}</Text>
                <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Gastos</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.incomeBg }]}>
                <Text style={[styles.summaryItemValue, { color: colors.income }]}>${data.summary.currentMonthIncome.toFixed(0)}</Text>
                <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Ingresos</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: data.summary.savingsRate >= 20 ? colors.incomeBg : colors.warningBg }]}>
                <Text style={[styles.summaryItemValue, { color: data.summary.savingsRate >= 20 ? colors.income : colors.warning }]}>{data.summary.savingsRate.toFixed(1)}%</Text>
                <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Ahorro</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.infoBg }]}>
                <Text style={[styles.summaryItemValue, { color: colors.info }]}>${data.summary.projectedMonthly.toFixed(0)}</Text>
                <Text style={[styles.summaryItemLabel, { color: colors.textSecondary }]}>Proyección</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Recommendations */}
      {data?.recommendations?.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Text style={[styles.sectionTitle, typography.h3, { color: colors.text, marginTop: spacing.lg }]}>Recomendaciones</Text>
          {data.recommendations.map((rec, i) => {
            const recStyle = getRecommendationStyle(rec.type);
            return (
              <Animated.View key={i} entering={FadeInDown.delay(200 + i * 100).duration(300)}>
                <View style={[styles.recCard, { backgroundColor: recStyle.bg, borderLeftColor: recStyle.border }]}>
                  <View style={styles.recHeader}>
                    <Text style={styles.recIcon}>{rec.icon}</Text>
                    <Text style={[styles.recTitle, { color: colors.text }]}>{rec.title}</Text>
                  </View>
                  <Text style={[styles.recMessage, { color: colors.textSecondary }]}>{rec.message}</Text>
                </View>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}

      {/* Tips */}
      <Animated.View entering={FadeInDown.delay(400).duration(300)}>
        <Text style={[styles.sectionTitle, typography.h3, { color: colors.text, marginTop: spacing.lg }]}>Consejos de Ahorro</Text>
        {tips.map((tip, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(500 + i * 80).duration(300)}>
            <Card>
              <View style={styles.tipRow}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
                <Text style={[styles.tipText, { color: colors.text }]}>{tip.text}</Text>
              </View>
            </Card>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryItem: { flex: 1, minWidth: '45%', borderRadius: 14, padding: 14, alignItems: 'center' },
  summaryItemValue: { fontSize: 22, fontWeight: '700' },
  summaryItemLabel: { fontSize: 13, marginTop: 2 },
  recCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  recIcon: { fontSize: 22, marginRight: 8 },
  recTitle: { fontSize: 15, fontWeight: '600' },
  recMessage: { fontSize: 13, lineHeight: 20 },
  tipRow: { flexDirection: 'row', alignItems: 'center' },
  tipIcon: { fontSize: 24, marginRight: 12 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
