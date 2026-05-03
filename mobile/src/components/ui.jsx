import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

export const Card = ({ children, style, onPress, variant = 'default' }) => {
  const { theme } = useTheme();
  const { spacing, radius, colors } = theme;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: variant === 'elevated' ? colors.surfaceElevated : colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      shadowColor: colors.cardShadow,
      shadowOpacity: 1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: variant === 'elevated' ? 4 : 1,
      borderWidth: variant === 'outlined' ? 1 : 0,
      borderColor: colors.border,
    },
    style,
  ];

  if (onPress) {
    return (
      <Animated.View entering={FadeIn.duration(300)} layout={Layout.springify()}>
        <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
          <View style={cardStyle}>{children}</View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} layout={Layout.springify()}>
      <View style={cardStyle}>{children}</View>
    </Animated.View>
  );
};

export const Button = ({ children, onPress, variant = 'primary', size = 'md', disabled, loading, icon, fullWidth }) => {
  const { theme } = useTheme();
  const { colors, radius, typography, spacing } = theme;

  const variantStyles = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.danger },
  };

  const textVariantStyles = {
    primary: { color: '#FFFFFF' },
    secondary: { color: colors.primary },
    ghost: { color: colors.primary },
    danger: { color: '#FFFFFF' },
  };

  const sizeStyles = {
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  };

  return (
    <Animated.View layout={Layout.springify()}>
      <TouchableOpacity
        style={[styles.button, variantStyles[variant], sizeStyles[size], { borderRadius: radius.md, opacity: disabled ? 0.6 : 1 }, fullWidth && { width: '100%' }]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <Text style={[styles.buttonText, textVariantStyles[variant]]}>Cargando...</Text>
        ) : (
          <Text style={[styles.buttonText, textVariantStyles[variant], typography.label]}>{children}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const Input = ({ label, placeholder, value, onChangeText, keyboardType, secureTextEntry, icon, multiline, error }) => {
  const { theme } = useTheme();
  const { colors, radius, spacing, typography } = theme;

  return (
    <View style={styles.inputContainer}>
      {label && <Text style={[styles.label, typography.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: 1,
            padding: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
          },
        ]}
      >
        {icon}
        <TextInput
          style={[typography.body, { color: colors.text, flex: 1, marginLeft: icon ? spacing.sm : 0 }]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={true}
        />
      </View>
      {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
    </View>
  );
};

export const StatCard = ({ label, value, icon, color, trend }) => {
  const { theme } = useTheme();
  const { colors, radius, spacing, typography } = theme;

  return (
    <Animated.View entering={FadeIn.duration(400)} layout={Layout.springify()}>
      <View
        style={[
          styles.statCard,
          { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
        ]}
      >
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          {icon}
        </View>
        <Text style={[styles.statValue, typography.h3, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? colors.incomeBg : colors.expenseBg }]}>
            <Text style={[styles.trendText, { color: trend > 0 ? colors.income : colors.expense }]}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export const EmptyState = ({ icon, title, description, action }) => {
  const { theme } = useTheme();
  const { colors, spacing, typography } = theme;

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={[typography.h3, { color: colors.text, marginTop: spacing.md }]}>{title}</Text>
      {description && (
        <Text style={[typography.bodySmall, { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' }]}>{description}</Text>
      )}
      {action}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  button: { alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  buttonText: { textAlign: 'center' },
  inputContainer: { marginBottom: 16 },
  label: { marginBottom: 8 },
  inputWrapper: { minHeight: 50 },
  errorText: { fontSize: 12, marginTop: 4 },
  statCard: { minWidth: 140, flex: 1 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { marginBottom: 2 },
  statLabel: {},
  trendBadge: { position: 'absolute', top: 8, right: 8, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  trendText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64 },
});
