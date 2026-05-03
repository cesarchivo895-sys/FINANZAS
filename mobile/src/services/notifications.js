import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }
  return true;
}

export async function scheduleBudgetAlert(budget, percentage) {
  let title, body, sound;

  if (percentage >= 100) {
    title = '🚨 Presupuesto Agotado';
    body = `Tu presupuesto de ${budget.categories?.name || 'General'} se ha agotado. Has gastado $${budget.spent.toFixed(2)} de $${budget.amount.toFixed(2)}.`;
    sound = 'default';
  } else if (percentage >= 90) {
    title = '⚠️ Presupuesto al Límite';
    body = `${budget.categories?.name || 'General'} está al ${percentage.toFixed(0)}%. Te quedan $${(budget.amount - budget.spent).toFixed(2)}.`;
    sound = 'default';
  } else if (percentage >= 75) {
    title = '💡 Atención al Presupuesto';
    body = `${budget.categories?.name || 'General'} está al ${percentage.toFixed(0)}%. Considera reducir gastos.`;
    sound = null;
  } else {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound,
      data: { budgetId: budget.id, percentage },
    },
    trigger: null,
  });

  return notificationId;
}

export async function scheduleDailyReminder(hour = 20, minute = 0) {
  const trigger = {
    hour,
    minute,
    repeats: true,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Recordatorio Diario',
      body: '¿Ya registraste tus gastos de hoy? Tómate un minuto para mantener tus finanzas al día.',
      sound: 'default',
    },
    trigger,
  });
}

export async function scheduleWeeklyReport(dayOfWeek = 0, hour = 18) {
  const trigger = {
    weekday: dayOfWeek + 1,
    hour,
    minute: 0,
    repeats: true,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📈 Resumen Semanal',
      body: 'Tu resumen semanal está listo. Revisa cómo van tus finanzas.',
      sound: 'default',
    },
    trigger,
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelNotification(notificationId) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function checkBudgetAlerts(budgetStatus) {
  const alerts = [];

  for (const budget of budgetStatus) {
    const percentage = budget.percentage || 0;

    if (percentage >= 75) {
      const notifId = await scheduleBudgetAlert(budget, percentage);
      if (notifId) {
        alerts.push({ budgetId: budget.id, notificationId: notifId, percentage });
      }
    }
  }

  return alerts;
}

export async function scheduleSavingsGoalAlert(goal, milestone) {
  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
  let title, body;

  switch (milestone) {
    case 25:
      title = '🎉 25% de tu meta';
      body = `¡Vas por buen camino! ${goal.name} está al 25%. Sigue ahorrando $${(goal.target_amount - goal.current_amount).toFixed(2)} para llegar.`;
      break;
    case 50:
      title = '🌟 ¡Mitad alcanzada!';
      body = `¡Felicidades! ${goal.name} está al 50%. Ya tienes $${goal.current_amount.toFixed(2)} ahorrados.`;
      break;
    case 75:
      title = '🔥 Casi lo logras!';
      body = `${goal.name} está al 75%. Solo te faltan $${(goal.target_amount - goal.current_amount).toFixed(2)}.`;
      break;
    case 100:
      title = '🏆 ¡Meta completada!';
      body = `¡Lo lograste! ${goal.name} ha alcanzado su objetivo de $${goal.target_amount.toFixed(2)}. ¡Felicidades!`;
      break;
    default:
      return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: milestone >= 75 ? 'default' : null,
      data: { goalId: goal.id, milestone },
    },
    trigger: null,
  });

  return notificationId;
}

export async function scheduleSavingsGoalDeadlineReminder(goal) {
  if (!goal.deadline) return null;
  const deadline = new Date(goal.deadline);
  const now = new Date();
  const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0 && goal.progress < 100) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Fecha límite alcanzada',
        body: `La fecha límite para ${goal.name} ha llegado. ${goal.progress.toFixed(0)}% completado.`,
        sound: 'default',
        data: { goalId: goal.id, type: 'deadline' },
      },
      trigger: null,
    });
    return notificationId;
  }

  if (daysRemaining === 7) {
    const monthlyNeeded = goal.remaining > 0 ? (goal.remaining / (daysRemaining / 30)).toFixed(2) : '0';
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Recordatorio de ahorro',
        body: `Falta 1 semana para ${goal.name}. Necesitas ahorrar $${monthlyNeeded} por semana para llegar.`,
        sound: 'default',
        data: { goalId: goal.id, type: 'deadline_reminder' },
      },
      trigger: null,
    });
    return notificationId;
  }

  return null;
}

export async function checkSavingsGoalAlerts(goals) {
  const alerts = [];

  for (const goal of goals) {
    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (progress >= milestone && progress < milestone + 10) {
        const notifId = await scheduleSavingsGoalAlert(goal, milestone);
        if (notifId) {
          alerts.push({ goalId: goal.id, notificationId: notifId, milestone });
        }
      }
    }

    const deadlineNotif = await scheduleSavingsGoalDeadlineReminder(goal);
    if (deadlineNotif) {
      alerts.push({ goalId: goal.id, notificationId: deadlineNotif, type: 'deadline' });
    }
  }

  return alerts;
}
