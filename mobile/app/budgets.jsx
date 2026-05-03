import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { useNotification } from '../src/context/NotificationContext';
import { budgetsApi, categoriesApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

export default function BudgetsScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const { showNotification } = useNotification();
  const { colors, radius, spacing, typography } = theme;
  const [budgets, setBudgets] = useState([]);
  const [status, setStatus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newBudget, setNewBudget] = useState({ amount: '', category_id: null, period: 'monthly' });

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [budgetsRes, statusRes, categoriesRes] = await Promise.all([
        budgetsApi.getAll(),
        budgetsApi.getStatus(),
        categoriesApi.getAll(),
      ]);
      setBudgets(budgetsRes.data);
      setStatus(statusRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!newBudget.amount || parseFloat(newBudget.amount) <= 0) {
      showNotification('Ingresa un monto válido', 'error');
      return;
    }
    try {
      const result = await budgetsApi.create({
        amount: parseFloat(newBudget.amount),
        category_id: newBudget.category_id,
        user_id: user.id,
        period: newBudget.period,
      });
      if (result.offline) {
        showNotification('Guardado en modo offline', 'warning');
      } else {
        showNotification('Presupuesto creado', 'success');
      }
      setShowForm(false);
      setNewBudget({ amount: '', category_id: null, period: 'monthly' });
      loadData();
    } catch (error) {
      showNotification('Error al crear presupuesto', 'error');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Eliminar', '¿Estás seguro?', [
      { text: 'Cancelar' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          const result = await budgetsApi.delete(id);
          if (result.offline) {
            showNotification('Eliminado en modo offline', 'warning');
          }
          loadData();
        } catch (e) {
          showNotification('Error al eliminar', 'error');
        }
      }},
    ]);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return colors.danger;
    if (percentage >= 75) return colors.warning;
    return colors.success;
  };

  const periodLabels = { daily: 'Diario', monthly: 'Mensual', yearly: 'Anual' };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add Button */}
      <Animated.View entering={FadeInDown.duration(300)}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>{showForm ? 'Cancelar' : '+ Nuevo Presupuesto'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Form */}
      {showForm && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Card variant="outlined">
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Monto"
              keyboardType="decimal-pad"
              value={newBudget.amount}
              onChangeText={(text) => setNewBudget({ ...newBudget, amount: text })}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.periodSelector}>
              {['daily', 'monthly', 'yearly'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodButton, { backgroundColor: colors.background }, newBudget.period === p && { backgroundColor: colors.primary }]}
                  onPress={() => setNewBudget({ ...newBudget, period: p })}
                >
                  <Text style={[styles.periodText, { color: colors.textSecondary }, newBudget.period === p && { color: '#FFFFFF', fontWeight: '600' }]}>
                    {periodLabels[p]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría (opcional)</Text>
            <View style={styles.categoriesRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryItem, { backgroundColor: colors.background }, newBudget.category_id === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}15` }]}
                  onPress={() => setNewBudget({ ...newBudget, category_id: cat.id })}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryName, { color: colors.textSecondary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleCreateBudget}>
              <Text style={styles.submitButtonText}>Crear Presupuesto</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      )}

      {/* Budget List */}
      {status.map((budget, index) => {
        const progressColor = getProgressColor(budget.percentage);
        return (
          <Animated.View key={budget.id} entering={FadeInDown.delay(index * 100).duration(300)}>
            <Card variant="elevated">
              <View style={styles.budgetHeader}>
                <View style={styles.budgetTitleRow}>
                  <View style={[styles.budgetIconBg, { backgroundColor: `${budget.categories?.color || colors.primary}20` }]}>
                    <Text style={styles.budgetIcon}>{budget.categories?.icon || '📦'}</Text>
                  </View>
                  <View>
                    <Text style={[styles.budgetName, typography.h3, { color: colors.text }]}>{budget.categories?.name || 'General'}</Text>
                    <Text style={[styles.budgetPeriod, typography.caption, { color: colors.textSecondary }]}>{periodLabels[budget.period]}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(budget.id)}>
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(budget.percentage, 100)}%`, backgroundColor: progressColor }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.text }]}>{budget.percentage.toFixed(0)}%</Text>
              </View>

              <View style={styles.budgetDetails}>
                <Text style={[styles.budgetDetail, { color: colors.textSecondary }]}>Gastado: <Text style={[{ color: colors.text, fontWeight: '600' }]}>${budget.spent.toFixed(2)}</Text></Text>
                <Text style={[styles.budgetDetail, { color: colors.textSecondary }]}>Límite: <Text style={[{ color: colors.text, fontWeight: '600' }]}>${budget.amount.toFixed(2)}</Text></Text>
              </View>

              <Text style={[styles.remaining, { color: budget.remaining >= 0 ? colors.success : colors.danger }]}>
                {budget.remaining >= 0 ? `Disponible: $${budget.remaining.toFixed(2)}` : `Excedido: $${Math.abs(budget.remaining).toFixed(2)}`}
              </Text>
            </Card>
          </Animated.View>
        );
      })}

      {status.length === 0 && !showForm && (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 48 }}>💰</Text>
          <Text style={[typography.h3, { color: colors.text, marginTop: 12 }]}>Sin presupuestos</Text>
          <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Crea un presupuesto para controlar tus gastos</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButton: { padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 12 },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  periodText: { fontSize: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryItem: { alignItems: 'center', padding: 10, borderRadius: 12, width: '22%', borderWidth: 2, borderColor: 'transparent' },
  categoryIcon: { fontSize: 24 },
  categoryName: { fontSize: 10, textAlign: 'center', marginTop: 4 },
  submitButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budgetTitleRow: { flexDirection: 'row', alignItems: 'center' },
  budgetIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  budgetIcon: { fontSize: 22 },
  budgetName: {},
  budgetPeriod: {},
  deleteText: { fontSize: 14, fontWeight: '600' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, marginRight: 10 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  budgetDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetDetail: { fontSize: 13 },
  remaining: { fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 16, marginTop: 16 },
});
