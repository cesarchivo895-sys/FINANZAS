import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { expensesApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import { Svg, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

const WIDTH = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const { colors, radius, spacing, typography } = theme;
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  useEffect(() => {
    if (user) loadSummary();
  }, [user, selectedPeriod]);

  const loadSummary = async () => {
    try {
      const response = await expensesApi.getSummary({ period: selectedPeriod });
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const periods = [
    { key: 'daily', label: 'Hoy' },
    { key: 'monthly', label: 'Mes' },
    { key: 'yearly', label: 'Año' },
  ];

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const totalExpenses = summary?.summary?.total_expenses || 0;
  const totalIncome = summary?.summary?.total_income || 0;
  const byCategory = summary?.byCategory || [];
  const dailyTrend = summary?.dailyTrend || [];
  const balance = totalIncome - totalExpenses;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Balance Card */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#FFFFFF' : '#FECACA' }]}>
            {balance >= 0 ? '+' : ''}${balance.toFixed(2)}
          </Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="trending-down" size={16} color="#EF4444" />
              <Text style={[styles.balanceItemValue, { color: '#FFFFFF' }]}>${totalExpenses.toFixed(2)}</Text>
              <Text style={styles.balanceItemLabel}>Gastos</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={[styles.balanceItemValue, { color: '#FFFFFF' }]}>${totalIncome.toFixed(2)}</Text>
              <Text style={styles.balanceItemLabel}>Ingresos</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, { backgroundColor: colors.surface }, selectedPeriod === p.key && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedPeriod(p.key)}
          >
            <Text style={[styles.periodText, { color: colors.textSecondary }, selectedPeriod === p.key && { color: '#FFFFFF', fontWeight: '600' }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Pie Chart */}
      {byCategory.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Card variant="elevated">
            <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Por Categoría</Text>
            <PieChart data={byCategory} total={totalExpenses} />
            <View style={styles.legend}>
              {byCategory.slice(0, 5).map((cat, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color || colors.primary }]} />
                  <Text style={[styles.legendName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.legendValue, { color: colors.textSecondary }]}>${cat.total?.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Daily Trend */}
      {dailyTrend.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(300)}>
          <Card variant="elevated">
            <Text style={[styles.cardTitle, typography.h3, { color: colors.text }]}>Tendencia</Text>
            <BarChart data={dailyTrend} colors={colors} />
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function PieChart({ data, total }) {
  const size = 180;
  const r = size / 2;
  const c = r;
  let cumulativePercent = 0;

  const getArcPath = (startPercent, endPercent) => {
    const startAngle = (startPercent * 360 - 90) * (Math.PI / 180);
    const endAngle = (endPercent * 360 - 90) * (Math.PI / 180);
    const largeArc = endPercent - startPercent > 0.5 ? 1 : 0;
    const x1 = c + r * Math.cos(startAngle);
    const y1 = c + r * Math.sin(startAngle);
    const x2 = c + r * Math.cos(endAngle);
    const y2 = c + r * Math.sin(endAngle);
    return `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <Svg width={size} height={size} style={{ alignSelf: 'center' }}>
      {data.slice(0, 6).map((item, i) => {
        const percent = total > 0 ? item.total / total : 0;
        const startPercent = cumulativePercent;
        const endPercent = cumulativePercent + percent;
        cumulativePercent = endPercent;
        return <path key={i} d={getArcPath(startPercent, endPercent)} fill={item.color || '#6C63FF'} stroke="#FFFFFF" strokeWidth="2" />;
      })}
      <Circle cx={c} cy={c} r={r * 0.55} fill="#FFFFFF" />
    </Svg>
  );
}

function BarChart({ data, colors }) {
  const maxHeight = 120;
  const barWidth = Math.min(20, (WIDTH - 100) / data.length - 4);
  const maxVal = Math.max(...data.map(d => d.expenses), 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: maxHeight + 30, justifyContent: 'space-around' }}>
      {data.slice(-14).map((item, i) => {
        const height = (item.expenses / maxVal) * maxHeight;
        return (
          <View key={i} style={{ alignItems: 'center' }}>
            <View style={{ height, width: barWidth, backgroundColor: colors.primary, borderRadius: 4 }} />
            <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>{item.date.slice(8)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  balanceAmount: { fontSize: 36, fontWeight: '800', marginTop: 4 },
  balanceRow: { flexDirection: 'row', marginTop: 16, gap: 16 },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceItemValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  balanceItemLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  periodText: { fontSize: 14 },
  cardTitle: { marginBottom: 16 },
  legend: { marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendName: { flex: 1, fontSize: 14 },
  legendValue: { fontSize: 14, fontWeight: '600' },
});
