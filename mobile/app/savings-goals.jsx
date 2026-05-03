import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { savingsGoalsApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function SavingsGoalsScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [goalsRes, summaryRes] = await Promise.all([
        savingsGoalsApi.getAll(),
        savingsGoalsApi.getSummary(),
      ]);
      setGoals(goalsRes.data || []);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error loading savings goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Eliminar', '¿Estás seguro de eliminar esta meta?', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await savingsGoalsApi.delete(id); loadData(); } catch (e) { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const filteredGoals = filter === 'all' ? goals : goals.filter(g => g.status === filter);
  const priorityColors = { low: colors.textMuted, medium: colors.warning, high: colors.danger };
  const priorityLabels = { low: 'Baja', medium: 'Media', high: 'Alta' };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary Card */}
      {summary && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card variant="elevated">
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>${summary.totalSaved.toFixed(0)}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ahorrado</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.text }]}>${summary.totalTarget.toFixed(0)}</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Objetivo</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{summary.totalProgress.toFixed(0)}%</Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Progreso</Text>
              </View>
            </View>
            <View style={styles.summaryProgressRow}>
              <View style={[styles.summaryProgressBar, { backgroundColor: colors.background }]}>
                <View style={[styles.summaryProgressFill, { width: `${Math.min(summary.totalProgress, 100)}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Filter Tabs */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Activas' },
            { key: 'completed', label: 'Completadas' },
            { key: 'paused', label: 'Pausadas' },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, { backgroundColor: colors.surface }, filter === f.key && { backgroundColor: colors.primary }]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f.key && { color: '#FFFFFF' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Add Button */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/add-savings-goal')}
        >
          <Text style={styles.addButtonText}>+ Nueva Meta</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Goals List */}
      {filteredGoals.map((goal, index) => (
        <Animated.View key={goal.id} entering={FadeInDown.delay(index * 100).duration(300)}>
          <TouchableOpacity
            style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/savings-goal-detail?id=${goal.id}`)}
          >
            <View style={styles.goalHeader}>
              <View style={[styles.goalIconBg, { backgroundColor: `${goal.color}20` }]}>
                <Text style={styles.goalIcon}>{goal.icon}</Text>
              </View>
              <View style={styles.goalTitleRow}>
                <Text style={[styles.goalName, typography.h3, { color: colors.text }]}>{goal.name}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColors[goal.priority] }]}>
                  <Text style={styles.priorityText}>{priorityLabels[goal.priority]}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleDelete(goal.id); }}>
                <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                <View style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: goal.color }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.text }]}>{goal.progress.toFixed(0)}%</Text>
            </View>

            <View style={styles.goalDetails}>
              <Text style={[styles.goalDetail, { color: colors.textSecondary }]}>
                Ahorrado: <Text style={{ color: colors.success, fontWeight: '600' }}>${goal.current_amount.toFixed(2)}</Text>
              </Text>
              <Text style={[styles.goalDetail, { color: colors.textSecondary }]}>
                Meta: <Text style={{ color: colors.text, fontWeight: '600' }}>${goal.target_amount.toFixed(2)}</Text>
              </Text>
            </View>

            {goal.deadline && (
              <Text style={[styles.deadline, { color: colors.textMuted }]}>
                Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-ES')}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      ))}

      {filteredGoals.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 48 }}>🎯</Text>
          <Text style={[typography.h3, { color: colors.text, marginTop: 12 }]}>Sin metas de ahorro</Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Crea una meta para empezar a ahorrar</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: '#E0E0E0', opacity: 0.5 },
  summaryProgressRow: { marginTop: 4 },
  summaryProgressBar: { height: 6, borderRadius: 3 },
  summaryProgressFill: { height: '100%', borderRadius: 3 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterTab: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center' },
  filterText: { fontSize: 13, fontWeight: '600' },
  addButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  goalCard: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  goalIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  goalIcon: { fontSize: 22 },
  goalTitleRow: { flex: 1 },
  goalName: {},
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 4 },
  priorityText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  deleteText: { fontSize: 16, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, marginRight: 10 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  goalDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalDetail: { fontSize: 13 },
  deadline: { fontSize: 12, marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 16, marginTop: 16 },
});
