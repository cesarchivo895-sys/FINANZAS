import { supabase } from './supabase';
import {
  saveExpenseOffline, deleteExpenseOffline, syncPending, getOfflineExpenses,
  saveBudgetOffline, deleteBudgetOffline,
  saveSavingsGoalOffline, deleteSavingsGoalOffline, saveContributionOffline, deleteContributionOffline,
  cacheCategories, getCachedCategories, isOnline
} from './offlineSync';

function getErrorMessage(error) {
  if (!error) return 'Algo salió mal';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error) return error.error;
  if (error.data?.error) return error.data.error;
  return 'Algo salió mal';
}

export const authApi = {
  register: async (name, email, password, currency) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, currency: currency || 'USD' } },
    });
    if (error) throw error;
    return {
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || name,
        email: data.user.email,
        currency: data.user.user_metadata?.currency || currency || 'USD',
      },
      session: data.session,
    };
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return {
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || 'Usuario',
        email: data.user.email,
        currency: data.user.user_metadata?.currency || 'USD',
      },
      session: data.session,
    };
  },

  guest: async () => {
    const guestEmail = `guest_${Date.now()}@temp.local`;
    const guestPassword = Math.random().toString(36).slice(-12);
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
      options: { data: { name: 'Usuario Invitado', currency: 'USD' } },
    });
    if (error) throw error;
    return {
      user: {
        id: data.user.id,
        name: 'Usuario Invitado',
        email: guestEmail,
        currency: 'USD',
      },
      session: data.session,
    };
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
};

export const expensesApi = {
  getAll: async (params = {}) => {
    let query = supabase.from('expenses').select(`*, categories(name, icon, color)`).order('date', { ascending: false });
    if (params.period) {
      const now = new Date();
      let start;
      switch (params.period) {
        case 'daily': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
      }
      if (start) query = query.gte('date', start.toISOString().split('T')[0]);
    }
    if (params.startDate && params.endDate) query = query.gte('date', params.startDate).lte('date', params.endDate);
    if (params.categoryId) query = query.eq('category_id', params.categoryId);

    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },

  create: async (expenseData) => {
    const online = await isOnline();
    if (!online) {
      const id = await saveExpenseOffline(expenseData);
      return { data: { id, ...expenseData, sync_status: 'pending' }, offline: true };
    }
    const { data, error } = await supabase.from('expenses').insert([expenseData]).select().single();
    if (error) throw error;
    return { data, offline: false };
  },

  update: async (id, expenseData) => {
    const { data, error } = await supabase.from('expenses').update(expenseData).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },

  delete: async (id) => {
    const online = await isOnline();
    if (!online) {
      await deleteExpenseOffline(id);
      return { offline: true };
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return { offline: false };
  },

  getSummary: async (params = {}) => {
    let query = supabase.from('expenses').select('*');
    if (params.period) {
      const now = new Date();
      let start;
      switch (params.period) {
        case 'daily': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
      }
      if (start) query = query.gte('date', start.toISOString().split('T')[0]);
    }
    if (params.startDate && params.endDate) query = query.gte('date', params.startDate).lte('date', params.endDate);

    const { data, error } = await query;
    if (error) throw error;

    const totalExpenses = data.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalIncome = data.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const categoryMap = {};
    data.filter(e => e.type === 'expense').forEach(e => {
      const catName = e.categories?.name || 'Otros';
      const catIcon = e.categories?.icon || '📦';
      const catColor = e.categories?.color || '#AEB6BF';
      if (!categoryMap[catName]) categoryMap[catName] = { name: catName, icon: catIcon, color: catColor, total: 0, count: 0 };
      categoryMap[catName].total += parseFloat(e.amount);
      categoryMap[catName].count += 1;
    });

    const byCategory = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const dailyMap = {};
    data.forEach(e => {
      if (!dailyMap[e.date]) dailyMap[e.date] = { date: e.date, expenses: 0, income: 0 };
      if (e.type === 'expense') dailyMap[e.date].expenses += parseFloat(e.amount);
      else dailyMap[e.date].income += parseFloat(e.amount);
    });
    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return { data: { summary: { total_expenses: totalExpenses, total_income: totalIncome }, byCategory, dailyTrend } };
  },

  sync: async () => await syncPending(),
  getOfflineExpenses: async () => await getOfflineExpenses(),
};

export const categoriesApi = {
  getAll: async () => {
    const online = await isOnline();
    if (!online) {
      const cached = await getCachedCategories();
      return { data: cached, offline: true };
    }
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    await cacheCategories(data);
    return { data, offline: false };
  },
  create: async (data) => {
    const { data: result, error } = await supabase.from('categories').insert([data]).select().single();
    if (error) throw error;
    return { data: result };
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('categories').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Categoría eliminada' };
  },
};

export const budgetsApi = {
  getAll: async (params = {}) => {
    let query = supabase.from('budgets').select(`*, categories(name, icon, color)`);
    if (params.period) query = query.eq('period', params.period);
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },
  create: async (data) => {
    const online = await isOnline();
    if (!online) {
      const id = await saveBudgetOffline(data);
      return { data: { id, ...data, sync_status: 'pending' }, offline: true };
    }
    const { data: result, error } = await supabase.from('budgets').insert([data]).select().single();
    if (error) throw error;
    return { data: result };
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase.from('budgets').update(data).eq('id', id).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id) => {
    const online = await isOnline();
    if (!online) {
      await deleteBudgetOffline(id);
      return { offline: true };
    }
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Presupuesto eliminado' };
  },
  getStatus: async () => {
    const { data: budgets, error } = await supabase.from('budgets').select(`*, categories(name, icon, color)`).gte('end_date', new Date().toISOString().split('T')[0]);
    if (error) throw error;

    const status = [];
    for (const budget of budgets) {
      let spentQuery = supabase.from('expenses').select('amount').eq('type', 'expense').gte('date', budget.start_date).lte('date', budget.end_date);
      if (budget.category_id) spentQuery = spentQuery.eq('category_id', budget.category_id);
      const { data: spentData } = await spentQuery;
      const spent = (spentData || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
      status.push({ ...budget, spent, remaining: budget.amount - spent, percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0 });
    }
    return { data: status };
  },
};

export const recommendationsApi = {
  getAll: async () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: currentMonthExpenses } = await supabase.from('expenses').select('amount').eq('type', 'expense').gte('date', currentMonth).lt('date', nextMonth);
    const { data: lastMonthExpenses } = await supabase.from('expenses').select('amount').eq('type', 'expense').gte('date', lastMonth).lt('date', currentMonth);
    const { data: currentMonthIncome } = await supabase.from('expenses').select('amount').eq('type', 'income').gte('date', currentMonth).lt('date', nextMonth);

    const totalCurrentExpenses = (currentMonthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalLastExpenses = (lastMonthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalCurrentIncome = (currentMonthIncome || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const savingsRate = totalCurrentIncome > 0 ? ((totalCurrentIncome - totalCurrentExpenses) / totalCurrentIncome) * 100 : 0;

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAverage = totalCurrentExpenses / daysInMonth;
    const remainingDays = daysInMonth - now.getDate();

    return {
      data: {
        recommendations: [],
        summary: { currentMonthExpenses: totalCurrentExpenses, lastMonthExpenses: totalLastExpenses, currentMonthIncome: totalCurrentIncome, savingsRate, dailyAverage, projectedMonthly: totalCurrentExpenses + (dailyAverage * remainingDays) },
      },
    };
  },
};

export const familiesApi = {
  create: async (name) => {
    const { data, error } = await supabase.rpc('create_family', { family_name: name });
    if (error) throw error;
    return { data };
  },
  getMy: async () => {
    const { data, error } = await supabase.from('family_members').select(`families(id, name, created_by, created_at), role`).order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data?.map(m => ({ ...m.families, role: m.role })) || [] };
  },
  invite: async (familyId, email) => {
    const { data, error } = await supabase.from('family_invitations').insert([{ family_id: familyId, email }]).select().single();
    if (error) throw error;
    return { data };
  },
  join: async (code) => {
    const { data, error } = await supabase.rpc('join_family', { invite_code: code });
    if (error) throw error;
    return { data };
  },
};

export const exportApi = {
  getReport: async (params = {}) => {
    let query = supabase.from('expenses').select(`*, categories(name, icon, color)`);
    if (params.period) {
      const now = new Date();
      let start;
      switch (params.period) {
        case 'daily': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
      }
      if (start) query = query.gte('date', start.toISOString().split('T')[0]);
    }
    if (params.startDate && params.endDate) query = query.gte('date', params.startDate).lte('date', params.endDate);
    const { data, error } = await query;
    if (error) throw error;

    const totalExpenses = data.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalIncome = data.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const categoryMap = {};
    data.filter(e => e.type === 'expense').forEach(e => {
      const name = e.categories?.name || 'Sin categoría';
      const icon = e.categories?.icon || '📦';
      if (!categoryMap[name]) categoryMap[name] = { icon, name, total: 0, count: 0 };
      categoryMap[name].total += parseFloat(e.amount);
      categoryMap[name].count++;
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    const dailyMap = {};
    data.forEach(e => {
      if (!dailyMap[e.date]) dailyMap[e.date] = { date: e.date, expenses: 0, income: 0 };
      if (e.type === 'expense') dailyMap[e.date].expenses += parseFloat(e.amount);
      else dailyMap[e.date].income += parseFloat(e.amount);
    });

    return {
      data: {
        expenses: data,
        summary: { totalExpenses, totalIncome, balance: totalIncome - totalExpenses },
        categories,
        daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      },
    };
  },
};

export const savingsGoalsApi = {
  getAll: async (params = {}) => {
    let query = supabase.from('savings_goals').select('*').order('created_at', { ascending: false });
    if (params.status) query = query.eq('status', params.status);
    if (params.priority) query = query.eq('priority', params.priority);
    const { data, error } = await query;
    if (error) throw error;
    const goalsWithProgress = (data || []).map(goal => ({
      ...goal,
      progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
      remaining: goal.target_amount - goal.current_amount,
    }));
    return { data: goalsWithProgress };
  },

  getById: async (id) => {
    const { data: goal, error } = await supabase.from('savings_goals').select('*').eq('id', id).single();
    if (error) throw error;
    if (!goal) throw new Error('Meta no encontrada');

    const { data: contributions, error: contribError } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('goal_id', goal.id)
      .order('date', { ascending: false });
    if (contribError) throw contribError;

    return {
      data: {
        ...goal,
        progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
        remaining: goal.target_amount - goal.current_amount,
        contributions: contributions || [],
      },
    };
  },

  create: async (data) => {
    const online = await isOnline();
    if (!online) {
      const id = await saveSavingsGoalOffline(data);
      return { data: { id, ...data, current_amount: 0, sync_status: 'pending' }, offline: true };
    }
    const { data: result, error } = await supabase.from('savings_goals').insert([{
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: 0,
    }]).select().single();
    if (error) throw error;
    return { data: result };
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from('savings_goals')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: result };
  },

  delete: async (id) => {
    const online = await isOnline();
    if (!online) {
      await deleteSavingsGoalOffline(id);
      return { offline: true };
    }
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Meta eliminada' };
  },

  contribute: async (goalId, amount, date, note) => {
    const online = await isOnline();
    if (!online) {
      const id = await saveContributionOffline({ goal_id: goalId, amount, date, note });
      return { data: { id, goal_id: goalId, amount, date, note, sync_status: 'pending' }, offline: true };
    }
    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .select('current_amount, target_amount')
      .eq('id', goalId)
      .single();
    if (goalError) throw goalError;

    const newAmount = goal.current_amount + parseFloat(amount);

    const { data: contribution, error: contribError } = await supabase
      .from('savings_contributions')
      .insert([{ goal_id: goalId, amount: parseFloat(amount), date: date || new Date().toISOString().split('T')[0], note }])
      .select()
      .single();
    if (contribError) throw contribError;

    await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', goalId);

    return {
      data: {
        contribution,
        goal: {
          ...goal,
          current_amount: newAmount,
          progress: goal.target_amount > 0 ? (newAmount / goal.target_amount) * 100 : 0,
        },
      },
    };
  },

  deleteContribution: async (goalId, contributionId) => {
    const { data: contribution, error: contribError } = await supabase
      .from('savings_contributions')
      .select('amount')
      .eq('id', contributionId)
      .eq('goal_id', goalId)
      .single();
    if (contribError) throw contribError;

    const { error: deleteError } = await supabase
      .from('savings_contributions')
      .delete()
      .eq('id', contributionId)
      .eq('goal_id', goalId);
    if (deleteError) throw deleteError;

    await supabase.rpc('decrement_savings_goal', {
      goal_id: goalId,
      amount_to_subtract: contribution.amount,
    });

    return { message: 'Contribución eliminada' };
  },

  getSummary: async () => {
    const { data: goals, error } = await supabase.from('savings_goals').select('target_amount, current_amount, status');
    if (error) throw error;
    const totalTarget = (goals || []).reduce((sum, g) => sum + parseFloat(g.target_amount),0);
    const totalSaved = (goals || []).reduce((sum, g) => sum + parseFloat(g.current_amount),0);
    const activeGoals = (goals || []).filter(g => g.status === 'active').length;
    const completedGoals = (goals || []).filter(g => g.status === 'completed').length;
    return {
      data: {
        totalTarget,
        totalSaved,
        totalProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
        activeGoals,
        completedGoals,
      },
    };
  },

  getById: async (id) => {
    const { data: goal, error } = await supabase.from('savings_goals').select('*').eq('id', id).single();
    if (error) throw error;
    if (!goal) throw new Error('Meta no encontrada');

    const { data: contributions, error: contribError } = await supabase
      .from('savings_contributions')
      .select('*')
      .eq('goal_id', goal.id)
      .order('date', { ascending: false });
    if (contribError) throw contribError;

    return {
      data: {
        ...goal,
        progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
        remaining: goal.target_amount - goal.current_amount,
        contributions: contributions || [],
      },
    };
  },

  create: async (data) => {
    const { data: result, error } = await supabase.from('savings_goals').insert([{
      ...data,
      target_amount: parseFloat(data.target_amount),
      current_amount: 0,
    }]).select().single();
    if (error) throw error;
    return { data: result };
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from('savings_goals')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: result };
  },

  delete: async (id) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) throw error;
    return { message: 'Meta eliminada' };
  },

  contribute: async (goalId, amount, date, note) => {
    const { data: goal, error: goalError } = await supabase
      .from('savings_goals')
      .select('current_amount, target_amount')
      .eq('id', goalId)
      .single();
    if (goalError) throw goalError;

    const newAmount = goal.current_amount + parseFloat(amount);

    const { data: contribution, error: contribError } = await supabase
      .from('savings_contributions')
      .insert([{ goal_id: goalId, amount: parseFloat(amount), date: date || new Date().toISOString().split('T')[0], note }])
      .select()
      .single();
    if (contribError) throw contribError;

    await supabase
      .from('savings_goals')
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', goalId);

    return {
      data: {
        contribution,
        goal: {
          ...goal,
          current_amount: newAmount,
          progress: goal.target_amount > 0 ? (newAmount / goal.target_amount) * 100 : 0,
        },
      },
    };
  },

  deleteContribution: async (goalId, contributionId) => {
    const { data: contribution, error: contribError } = await supabase
      .from('savings_contributions')
      .select('amount')
      .eq('id', contributionId)
      .eq('goal_id', goalId)
      .single();
    if (contribError) throw contribError;

    const { error: deleteError } = await supabase
      .from('savings_contributions')
      .delete()
      .eq('id', contributionId)
      .eq('goal_id', goalId);
    if (deleteError) throw deleteError;

    await supabase.rpc('decrement_savings_goal', {
      goal_id: goalId,
      amount_to_subtract: contribution.amount,
    });

    return { message: 'Contribución eliminada' };
  },

  getSummary: async () => {
    const { data: goals, error } = await supabase.from('savings_goals').select('target_amount, current_amount, status');
    if (error) throw error;
    const totalTarget = (goals || []).reduce((sum, g) => sum + parseFloat(g.target_amount), 0);
    const totalSaved = (goals || []).reduce((sum, g) => sum + parseFloat(g.current_amount), 0);
    const activeGoals = (goals || []).filter(g => g.status === 'active').length;
    const completedGoals = (goals || []).filter(g => g.status === 'completed').length;
    return {
      data: {
        totalTarget,
        totalSaved,
        totalProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
        activeGoals,
        completedGoals,
      },
    };
  },
};
