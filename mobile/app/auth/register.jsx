import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/context/AppContext';
import { validators } from '../../src/utils/validators';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { register } = useApp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const nameError = validators.required(name, 'Nombre');
    if (nameError) newErrors.name = nameError;

    const emailError = validators.email(email);
    if (emailError) newErrors.email = emailError;

    const passError = validators.password(password);
    if (passError) newErrors.password = passError;

    const confirmError = validators.confirmPassword(password, confirmPassword);
    if (confirmError) newErrors.confirmPassword = confirmError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, currency);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  };

  const currencies = [
    { code: 'USD', symbol: '$', name: 'Dólar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'MXN', symbol: '$', name: 'Peso MX' },
    { code: 'COP', symbol: '$', name: 'Peso CO' },
    { code: 'ARS', symbol: '$', name: 'Peso AR' },
  ];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.title}>Crear Cuenta</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <Ionicons name="person-outline" size={20} color="#888" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Tu nombre" value={name} onChangeText={(text) => { setName(text); setErrors({...errors, name: undefined}); }} placeholderTextColor="#999" />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.icon} />
              <TextInput style={styles.input} placeholder="tu@email.com" value={email} onChangeText={(text) => { setEmail(text); setErrors({...errors, email: undefined}); }} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#999" />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" value={password} onChangeText={(text) => { setPassword(text); setErrors({...errors, password: undefined}); }} secureTextEntry placeholderTextColor="#999" />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirmar Contraseña</Text>
            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Repite tu contraseña" value={confirmPassword} onChangeText={(text) => { setConfirmPassword(text); setErrors({...errors, confirmPassword: undefined}); }} secureTextEntry placeholderTextColor="#999" />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Moneda</Text>
            <View style={styles.currencyRow}>
              {currencies.map(c => (
                <TouchableOpacity key={c.code} style={[styles.currencyItem, currency === c.code && styles.currencyItemSelected]} onPress={() => setCurrency(c.code)}>
                  <Text style={[styles.currencySymbol, currency === c.code && styles.currencySymbolSelected]}>{c.symbol}</Text>
                  <Text style={[styles.currencyCode, currency === c.code && styles.currencyCodeSelected]}>{c.code}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerButtonText}>Crear Cuenta</Text>}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Text style={styles.loginLink}>Inicia Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 },
  backButton: { marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  form: { padding: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 15 },
  inputError: { borderWidth: 1, borderColor: '#FF6B6B', backgroundColor: '#FFF5F5' },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#333' },
  errorText: { fontSize: 12, color: '#FF6B6B', marginTop: 4, marginLeft: 4 },
  currencyRow: { flexDirection: 'row', gap: 10 },
  currencyItem: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: 'transparent' },
  currencyItemSelected: { borderColor: '#4A90D9', backgroundColor: '#e8f0fe' },
  currencySymbol: { fontSize: 22, fontWeight: 'bold', color: '#666' },
  currencySymbolSelected: { color: '#4A90D9' },
  currencyCode: { fontSize: 10, color: '#888', marginTop: 2 },
  currencyCodeSelected: { color: '#4A90D9' },
  registerButton: { backgroundColor: '#4A90D9', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  registerButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { color: '#888', fontSize: 14 },
  loginLink: { color: '#4A90D9', fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
});
