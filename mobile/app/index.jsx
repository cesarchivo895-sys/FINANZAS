import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { expensesApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user, logout, loading: authLoading } = useApp();
  const { theme, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  const { colors, radius, spacing, typography } = theme;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (user) loadExpenses();
  }, [user, selectedPeriod, authLoading]);

  const loadExpenses = async () => {
    if (!user) return;
    try {
      const response = await expensesApi.getAll({ period: selectedPeriod });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const periods = [
    { key: 'daily', label: 'Hoy', icon: 'today' },
    { key: 'monthly', label: 'Mes', icon: 'calendar' },
    { key: 'yearly', label: 'Año', icon: 'calendar-number' },
  ];

  const quickActions = [
    { icon: 'stats-chart', label: 'Dashboard', route: '/dashboard', color: colors.accent },
    { icon: 'wallet', label: 'Presupuestos', route: '/budgets', color: colors.primary },
    { icon: 'download-outline', label: 'Exportar', route: '/export', color: colors.warning },
    { icon: 'bulb', label: 'Tips', route: '/recommendations', color: colors.secondary },
  ];

  const renderExpense = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)} layout={Layout.springify()}>
      <TouchableOpacity activeOpacity={0.7} style={[styles.expenseItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.categoryIcon, { backgroundColor: item.categories?.color || colors.primary }]}>
          <Text style={styles.categoryIconText}>{item.categories?.icon || '💵'}</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={[styles.expenseDescription, { color: colors.text }]}>{item.description || 'Sin descripción'}</Text>
          <Text style={[styles.expenseCategory, { color: colors.textSecondary }]}>{item.categories?.name || 'Sin categoría'}</Text>
          <Text style={[styles.expenseDate, { color: colors.textMuted }]}>{item.date}</Text>
        </View>
        <Text style={[styles.expenseAmount, { color: item.type === 'income' ? colors.income : colors.expense }]}>
          {item.type === 'income' ? '+' : '-'}${parseFloat(item.amount).toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (authLoading || loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>Hola 👋</Text>
            <Text style={styles.nameText}>{user?.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Ionicons name="trending-down" size={20} color="#EF4444" />
            </View>
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={styles.summaryValueExpense}>${totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
            </View>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={styles.summaryValueIncome}>${totalIncome.toFixed(2)}</Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, selectedPeriod === p.key && { backgroundColor: 'rgba(255,255,255,0.25)' }]}
              onPress={() => setSelectedPeriod(p.key)}
            >
              <Ionicons name={p.icon} size={16} color={selectedPeriod === p.key ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.periodText, selectedPeriod === p.key && { color: '#FFFFFF', fontWeight: '600' }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Quick Actions */}
      <View style={[styles.quickActions, { backgroundColor: colors.surface }]}>
        {quickActions.map((action, i) => (
          <TouchableOpacity
            key={action.route}
            style={styles.quickAction}
            onPress={() => router.push(action.route)}
          >
            <Animated.View entering={FadeIn.delay(i * 100).duration(300)} style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </Animated.View>
            <Text style={[styles.quickActionText, { color: colors.textSecondary }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        renderItem={renderExpense}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>Sin registros aún</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: 4 }]}>Agrega tu primer gasto o ingreso</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push('/add-expense')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  greetingText: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  nameText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  summaryValueExpense: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  summaryValueIncome: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  periodSelector: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  periodButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  periodText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  quickAction: { flex: 1, alignItems: 'center' },
  quickActionIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickActionText: { fontSize: 12, fontWeight: '500' },
  list: { paddingBottom: 100 },
  expenseItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  categoryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  categoryIconText: { fontSize: 22 },
  expenseInfo: { flex: 1 },
  expenseDescription: { fontSize: 15, fontWeight: '600' },
  expenseCategory: { fontSize: 12, marginTop: 2 },
  expenseDate: { fontSize: 11, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, borderRadius: 16, margin: 20 },
});
