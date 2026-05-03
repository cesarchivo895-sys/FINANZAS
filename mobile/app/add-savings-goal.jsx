import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { useTheme } from '../src/context/ThemeContext';
import { useNotification } from '../src/context/NotificationContext';
import { savingsGoalsApi } from '../src/services/api';
import { validators } from '../src/utils/validators';
import { Card } from '../src/components/ui';
import Animated, { FadeInDown } from 'react-native-reanimated';

const ICONS = ['🎯', '🏖️', '🚗', '🏠', '📚', '💻', '👶', '💍', '✈️', '🎓'];
const COLORS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#82E0AA'];

export default function AddSavingsGoalScreen() {
  const { user } = useApp();
  const { theme } = useTheme();
  const router = useRouter();
  const { colors, radius, spacing, typography } = theme;
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#6C63FF');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const nameError = validators.required(name, 'Nombre');
    if (nameError) newErrors.name = nameError;

    const amountError = validators.amount(targetAmount, 'Monto objetivo');
    if (amountError) newErrors.targetAmount = amountError;

    if (deadline) {
      const dateError = validators.date(deadline);
      if (dateError) newErrors.deadline = dateError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await savingsGoalsApi.create({
        name,
        target_amount: parseFloat(targetAmount),
        deadline: deadline || null,
        priority,
        icon,
        color,
        notes: notes || null,
        user_id: user.id,
      });
      if (result.offline) {
        showNotification('Guardado en modo offline', 'warning');
      } else {
        showNotification('Meta creada exitosamente', 'success');
      }
      router.back();
    } catch (error) {
      showNotification(error.message || 'Error al crear meta', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getMonthsRemaining = () => {
    if (!deadline) return null;
    const now = new Date();
    const target = new Date(deadline);
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return months > 0 ? months : 1;
  };

  const getMonthlySavings = () => {
    const months = getMonthsRemaining();
    if (!months || !targetAmount || parseFloat(targetAmount) <= 0) return null;
    return (parseFloat(targetAmount) / months).toFixed(2);
  };

  const monthlySavings = getMonthlySavings();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <Card variant="outlined">
          <Text style={[styles.label, { color: colors.text }]}>Nombre de la meta</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.name ? colors.danger : colors.border }]}
            placeholder="Ej: Vacaciones 2026"
            value={name}
            onChangeText={(text) => { setName(text); setErrors({ ...errors, name: undefined }); }}
            placeholderTextColor={colors.textMuted}
          />
          {errors.name && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.name}</Text>}

          <Text style={[styles.label, { color: colors.text }]}>Monto objetivo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.targetAmount ? colors.danger : colors.border }]}
            placeholder="10000"
            keyboardType="decimal-pad"
            value={targetAmount}
            onChangeText={(text) => { setTargetAmount(text); setErrors({ ...errors, targetAmount: undefined }); }}
            placeholderTextColor={colors.textMuted}
          />
          {errors.targetAmount && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.targetAmount}</Text>}

          {monthlySavings && (
            <View style={[styles.projectionBox, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
              <Text style={[styles.projectionText, { color: colors.text }]}>
                Ahorro mensual estimado: <Text style={{ fontWeight: '700', color: colors.primary }}>${monthlySavings}</Text>
              </Text>
              <Text style={[styles.projectionSubtext, { color: colors.textSecondary }]}>
                en {getMonthsRemaining()} meses
              </Text>
            </View>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Fecha límite (opcional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: errors.deadline ? colors.danger : colors.border }]}
            placeholder="YYYY-MM-DD"
            value={deadline}
            onChangeText={(text) => { setDeadline(text); setErrors({ ...errors, deadline: undefined }); }}
            placeholderTextColor={colors.textMuted}
          />
          {errors.deadline && <Text style={[styles.errorText, { color: colors.danger }]}>{errors.deadline}</Text>}

          <Text style={[styles.label, { color: colors.text }]}>Icono</Text>
          <View style={styles.iconsRow}>
            {ICONS.map(i => (
              <TouchableOpacity
                key={i}
                style={[styles.iconOption, { backgroundColor: colors.background }, icon === i && { borderColor: colors.primary }]}
                onPress={() => setIcon(i)}
              >
                <Text style={styles.iconOptionText}>{i}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Color</Text>
          <View style={styles.colorsRow}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorOption, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: c, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5 }]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Prioridad</Text>
          <View style={styles.priorityRow}>
            {[
              { key: 'low', label: 'Baja', emoji: '🟢' },
              { key: 'medium', label: 'Media', emoji: '🟡' },
              { key: 'high', label: 'Alta', emoji: '🔴' },
            ].map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.priorityOption, { backgroundColor: colors.background }, priority === p.key && { borderColor: colors.primary }]}
                onPress={() => setPriority(p.key)}
              >
                <Text style={styles.priorityEmoji}>{p.emoji}</Text>
                <Text style={[styles.priorityLabel, { color: colors.text }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Notas (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Notas adicionales..."
            value={notes}
            onChangeText={setNotes}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>{saving ? 'Guardando...' : 'Crear Meta'}</Text>
          </TouchableOpacity>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 4 },
  errorText: { fontSize: 12, marginBottom: 8, marginLeft: 4 },
  textArea: { height: 80, textAlignVertical: 'top' },
  projectionBox: { padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  projectionText: { fontSize: 14 },
  projectionSubtext: { fontSize: 12, marginTop: 2 },
  iconsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  iconOption: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconOptionText: { fontSize: 24 },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  priorityOption: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  priorityEmoji: { fontSize: 20 },
  priorityLabel: { fontSize: 13, marginTop: 4 },
  submitButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
