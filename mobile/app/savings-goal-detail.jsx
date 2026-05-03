import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { savingsGoalsApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function SavingsGoalDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useApp();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNote, setContributionNote] = useState('');
  const [showContributionForm, setShowContributionForm] = useState(false);

  useEffect(() => { loadGoal(); }, [id]);

  const loadGoal = async () => {
    try {
      const res = await savingsGoalsApi.getById(id);
      setGoal(res.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la meta');
    } finally {
      setLoading(false);
    }
  };

  const handleContribution = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    try {
      const res = await savingsGoalsApi.contribute(id, parseFloat(contributionAmount), new Date().toISOString().split('T')[0], contributionNote);
      setGoal(res.data.goal);
      Alert.alert('✅', 'Contribución agregada');
      setContributionAmount('');
      setContributionNote('');
      setShowContributionForm(false);
      loadGoal();
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar la contribución');
    }
  };

  const getMonthlyNeeded = () => {
    if (!goal?.deadline || !goal.remaining) return null;
    const now = new Date();
    const target = new Date(goal.deadline);
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return months > 0 ? (goal.remaining / months).toFixed(2) : null;
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!goal) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.text }}>Meta no encontrada</Text></View>;
  }

  const monthlyNeeded = getMonthlyNeeded();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Goal Header */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card variant="elevated">
          <View style={styles.headerRow}>
            <View style={[styles.iconBg, { backgroundColor: `${goal.color}20` }]}>
              <Text style={styles.iconText}>{goal.icon}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.goalName, typography.h2, { color: colors.text }]}>{goal.name}</Text>
              <Text style={[styles.status, { color: goal.status === 'completed' ? colors.success : colors.textMuted }]}>
                {goal.status === 'completed' ? '✅ Completada' : goal.status === 'paused' ? '⏸️ Pausada' : '🎯 Activa'}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${Math.min(goal.progress, 100)}%`, backgroundColor: goal.color }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.text }]}>{goal.progress.toFixed(0)}%</Text>
          </View>

          <View style={styles.amountsRow}>
            <Text style={[styles.currentAmount, { color: colors.success }]}>${goal.current_amount.toFixed(2)}</Text>
            <Text style={[styles.targetAmount, { color: colors.textMuted }]}>/ ${goal.target_amount.toFixed(2)}</Text>
          </View>

          {goal.deadline && (
            <Text style={[styles.deadline, { color: colors.textMuted }]}>
              Fecha límite: {new Date(goal.deadline).toLocaleDateString('es-ES')}
            </Text>
          )}

          {monthlyNeeded && (
            <View style={[styles.monthlyBox, { backgroundColor: `${goal.color}10`, borderColor: goal.color }]}>
              <Text style={[styles.monthlyText, { color: colors.text }]}>
                Necesitas ahorrar <Text style={{ fontWeight: '700', color: goal.color }}>${monthlyNeeded}</Text> por mes
              </Text>
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Add Contribution Button */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: goal.color }]}
          onPress={() => setShowContributionForm(!showContributionForm)}
        >
          <Text style={styles.addButtonText}>{showContributionForm ? 'Cancelar' : '+ Agregar Ahorro'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Contribution Form */}
      {showContributionForm && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Card variant="outlined">
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Monto a ahorrar"
              keyboardType="decimal-pad"
              value={contributionAmount}
              onChangeText={setContributionAmount}
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Nota (opcional)"
              value={contributionNote}
              onChangeText={setContributionNote}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: goal.color }]} onPress={handleContribution}>
              <Text style={styles.submitButtonText}>Agregar</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      )}

      {/* Contributions History */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <Text style={[styles.sectionTitle, typography.h3, { color: colors.text }]}>Historial de contribuciones</Text>
        {goal.contributions?.length > 0 ? (
          goal.contributions.map((contrib, index) => (
            <Card key={contrib.id} variant="outlined">
              <View style={styles.contribRow}>
                <View style={[styles.contribIconBg, { backgroundColor: `${goal.color}20` }]}>
                  <Text style={styles.contribIcon}>💰</Text>
                </View>
                <View style={styles.contribText}>
                  <Text style={[styles.contribAmount, { color: colors.success }]}>+${parseFloat(contrib.amount).toFixed(2)}</Text>
                  <Text style={[styles.contribDate, { color: colors.textMuted }]}>{new Date(contrib.date).toLocaleDateString('es-ES')}</Text>
                  {contrib.note && <Text style={[styles.contribNote, { color: colors.textSecondary }]}>{contrib.note}</Text>}
                </View>
              </View>
            </Card>
          ))
        ) : (
          <View style={[styles.emptyContrib, { backgroundColor: colors.surface }]}>
            <Text style={[typography.bodySmall, { color: colors.textMuted }]}>Sin contribuciones aún</Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBg: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  iconText: { fontSize: 30 },
  headerText: { flex: 1 },
  goalName: {},
  status: { fontSize: 14, marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressBar: { flex: 1, height: 12, borderRadius: 6, marginRight: 12 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressText: { fontSize: 16, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  amountsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  currentAmount: { fontSize: 28, fontWeight: '700' },
  targetAmount: { fontSize: 18, marginLeft: 4 },
  deadline: { fontSize: 13, marginTop: 4 },
  monthlyBox: { padding: 12, borderRadius: 12, marginTop: 12, borderWidth: 1 },
  monthlyText: { fontSize: 14 },
  addButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 12 },
  submitButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sectionTitle: { marginTop: 20, marginBottom: 12 },
  contribRow: { flexDirection: 'row', alignItems: 'center' },
  contribIconBg: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contribIcon: { fontSize: 20 },
  contribText: { flex: 1 },
  contribAmount: { fontSize: 16, fontWeight: '700' },
  contribDate: { fontSize: 12, marginTop: 2 },
  contribNote: { fontSize: 12, marginTop: 2 },
  emptyContrib: { padding: 20, borderRadius: 12, alignItems: 'center' },
});
