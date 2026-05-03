import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { expensesApi, categoriesApi } from '../src/services/api';
import { Card } from '../src/components/ui';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function AddExpenseScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, radius, spacing, typography } = theme;

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Ingresa una descripción');
      return;
    }

    setLoading(true);
    try {
      await expensesApi.create({
        amount: parseFloat(amount),
        description: description.trim(),
        category_id: selectedCategory?.id,
        user_id: user.id,
        date,
        type,
      });
      Alert.alert('✅', type === 'expense' ? 'Gasto registrado correctamente' : 'Ingreso registrado correctamente');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      {/* Type Selector */}
      <Animated.View entering={FadeInDown.duration(300)} style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, { borderColor: colors.border, backgroundColor: colors.surface }, type === 'expense' && { borderColor: colors.expense, backgroundColor: colors.expenseBg }]}
          onPress={() => setType('expense')}
        >
          <Text style={[styles.typeText, { color: colors.textSecondary }, type === 'expense' && { color: colors.expense }]}>💸 Gasto</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, { borderColor: colors.border, backgroundColor: colors.surface }, type === 'income' && { borderColor: colors.income, backgroundColor: colors.incomeBg }]}
          onPress={() => setType('income')}
        >
          <Text style={[styles.typeText, { color: colors.textSecondary }, type === 'income' && { color: colors.income }]}>💰 Ingreso</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Amount */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Monto</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text }]}
          keyboardType="decimal-pad"
          placeholder="$0.00"
          value={amount}
          onChangeText={setAmount}
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
      </Animated.View>

      {/* Description */}
      <Animated.View entering={FadeInDown.delay(200).duration(300)} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Descripción</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Ej: Supermercado"
          value={description}
          onChangeText={setDescription}
          placeholderTextColor={colors.textMuted}
        />
      </Animated.View>

      {/* Category */}
      <Animated.View entering={FadeInDown.delay(300).duration(300)} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Categoría</Text>
        <View style={styles.categoriesGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryItem, selectedCategory?.id === cat.id && { borderColor: cat.color, backgroundColor: `${cat.color}15` }]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryName, { color: colors.textSecondary }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Date */}
      <Animated.View entering={FadeInDown.delay(400).duration(300)} style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, typography.label, { color: colors.textSecondary }]}>Fecha</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          placeholderTextColor={colors.textMuted}
        />
      </Animated.View>

      {/* Submit */}
      <Animated.View entering={FadeInDown.delay(500).duration(300)}>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
  typeText: { fontSize: 16, fontWeight: '600' },
  field: { marginBottom: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  label: { marginBottom: 10 },
  amountInput: { fontSize: 32, fontWeight: '700' },
  input: { fontSize: 16, padding: 0 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryItem: { width: '30%', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  categoryIcon: { fontSize: 28, marginBottom: 4 },
  categoryName: { fontSize: 11, textAlign: 'center' },
  submitButton: { padding: 18, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6, marginTop: 8, marginBottom: 40 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
