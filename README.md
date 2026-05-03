# Finanzas Familia 💰

Aplicación móvil para el control de gastos familiares con **Supabase**, modo offline, temas, exportación y notificaciones.

## Stack

- **BD:** Supabase (PostgreSQL) con Row Level Security
- **Auth:** Supabase Auth (email/password)
- **Backend API:** Express.js (opcional, para export CSV)
- **Mobile:** React Native + Expo con SQLite local para offline
- **Sync:** Offline-first con sync automático
- **UI:** Sistema de temas claro/oscuro con animaciones

## Estructura

```
finanzas-familia/
├── backend/
│   ├── supabase/schema.sql   # Schema para Supabase
│   └── src/
│       ├── routes/
│       │   ├── auth.js
│       │   ├── expenses.js
│       │   ├── budgets.js
│       │   ├── export.js      # Export CSV backend
│       │   └── ...
│       └── server.js
│
└── mobile/
    └── src/
        ├── services/
        │   ├── supabase.js     # Cliente Supabase
        │   ├── api.js          # API wrapper
        │   ├── offlineSync.js  # Sync offline SQLite
        │   └── notifications.js# Push notifications
        ├── utils/
        │   ├── theme.js        # Temas claro/oscuro
        │   └── export.js       # Export CSV
        └── context/
            ├── AppContext.js   # Auth state
            └── ThemeContext.js # Tema actual
```

## Configuración

### 1. Supabase

Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta `backend/supabase/schema.sql` en el SQL Editor.

### 2. Variables de entorno

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

**Mobile** (`mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Ejecutar

```bash
# Backend
cd backend && npm install && npm run dev

# Mobile
cd mobile && npm install && npm start
```

## Características

### Core
- 🔐 Auth con Supabase (registro, login, invitado)
- 💾 Offline-first con SQLite local
- 🔄 Sync automático cuando hay conexión
- 📊 Dashboard con gráficos de torta y barras
- 💰 Presupuestos por período (diario/mensual/anual)
- 🎯 Metas de ahorro con seguimiento de progreso
- 💡 Recomendaciones inteligentes

### UI/UX
- 🌓 Tema claro, oscuro y automático
- ✨ Animaciones suaves con react-native-reanimated
- 🎨 Diseño moderno con tarjetas elevadas
- 📱 Responsive y adaptativo

### Exportar Datos
- 📄 Exportar transacciones a CSV
- 📊 Compartir resumen financiero
- 📈 Reportes detallados por período

### Notificaciones
- 🔔 Alertas de presupuesto (75%, 90%, 100%)
- ⏰ Recordatorio diario para registrar gastos
- 📅 Resumen semanal automático
- 🎯 Alertas de metas de ahorro (25%, 50%, 75%, 100%)

## Pantallas

| Pantalla | Descripción |
|----------|-------------|
| `index.jsx` | Home con resumen y lista de gastos |
| `auth/login.jsx` | Login con email/password |
| `auth/register.jsx` | Registro con moneda |
| `add-expense.jsx` | Registrar gasto/ingreso |
| `dashboard.jsx` | Dashboard con gráficos |
| `budgets.jsx` | Gestión de presupuestos |
| `savings-goals.jsx` | Lista de metas de ahorro |
| `add-savings-goal.jsx` | Crear nueva meta de ahorro |
| `savings-goal-detail.jsx` | Detalle y contribuciones de meta |
| `recommendations.jsx` | Recomendaciones y consejos |
| `export.jsx` | Exportar y compartir datos |
| `notification-settings.jsx` | Configurar notificaciones |
| `settings.jsx` | Configuración general y tema |

## Endpoints Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro |
| POST | `/api/auth/login` | Login |
| GET | `/api/expenses` | Mis gastos |
| POST | `/api/expenses` | Crear gasto |
| GET | `/api/expenses/summary` | Resumen |
| GET | `/api/export/csv` | Descargar CSV |
| GET | `/api/export/report` | Reporte JSON |
| GET | `/api/budgets/status` | Estado presupuestos |
| GET | `/api/savings-goals` | Mis metas de ahorro |
| POST | `/api/savings-goals` | Crear meta |
| POST | `/api/savings-goals/:id/contribute` | Agregar ahorro |
| GET | `/api/savings-goals/summary` | Resumen de metas |
