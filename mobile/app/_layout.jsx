import { Stack } from 'expo-router';
import { AppProvider } from '../src/context/AppContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { NotificationProvider, useNotification } from '../src/context/NotificationContext';
import { StatusBar } from 'expo-status-bar';

function StackNavigator() {
  const { theme } = useTheme();
  const isDark = theme.colors.background === '#0F0F1A';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Finanzas Familia', headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ title: 'Nuevo Gasto' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Stack.Screen name="budgets" options={{ title: 'Presupuestos' }} />
        <Stack.Screen name="recommendations" options={{ title: 'Recomendaciones' }} />
        <Stack.Screen name="export" options={{ title: 'Exportar Datos' }} />
        <Stack.Screen name="notification-settings" options={{ title: 'Notificaciones' }} />
        <Stack.Screen name="savings-goals" options={{ title: 'Metas de Ahorro' }} />
        <Stack.Screen name="add-savings-goal" options={{ title: 'Nueva Meta' }} />
        <Stack.Screen name="savings-goal-detail" options={{ title: 'Detalle de Meta', headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Configuración' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NotificationProvider>
          <StackNavigator />
        </NotificationProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
