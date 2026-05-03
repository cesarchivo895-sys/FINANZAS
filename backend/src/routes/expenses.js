const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const { period, startDate, endDate, categoryId, limit = 100 } = req.query;
  const limitNum = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);

  let query = supabase
    .from('expenses')
    .select(`
      *,
      categories (name, icon, color)
    `)
    .eq('user_id', req.user.id)
    .order('date', { ascending: false })
    .limit(limitNum);

  if (startDate && endDate) {
    query = query.gte('date', startDate).lte('date', endDate);
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  if (period) {
    const now = new Date();
    let start;
    switch (period) {
      case 'daily': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
    }
    if (start) query = query.gte('date', start.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { amount, description, category_id, date, type, recurring, recurring_interval } = req.body;

  if (!amount || !date) return res.status(400).json({ error: 'amount y date son requeridos' });

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        amount: parseFloat(amount),
        description: description || null,
        category_id: category_id || null,
        user_id: req.user.id,
        date,
        type: type || 'expense',
        recurring: recurring || false,
        recurring_interval: recurring_interval || null,
      }])
      .select('*, categories(name, icon, color)')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { amount, description, category_id, date, type } = req.body;

  try {
    const existing = await supabase
      .from('expenses')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!existing.data) return res.status(404).json({ error: 'Gasto no encontrado' });

    const { data, error } = await supabase
      .from('expenses')
      .update({ amount, description, category_id, date, type })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Gasto eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const userId = req.user.id;

  let query = supabase.from('expenses').select('*').eq('user_id', userId);

  if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);
  if (period) {
    const now = new Date();
    let start;
    switch (period) {
      case 'daily': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
    }
    if (start) query = query.gte('date', start.toISOString().split('T')[0]);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const totalExpenses = data.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = data.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const categoryMap = {};
  data.filter(e => e.type === 'expense').forEach(e => {
    const catName = e.categories?.name || 'Otros';
    const catIcon = e.categories?.icon || '📦';
    const catColor = e.categories?.color || '#AEB6BF';
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, icon: catIcon, color: catColor, total: 0, count: 0 };
    }
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

  res.json({
    summary: { total_expenses: totalExpenses, total_income: totalIncome },
    byCategory,
    dailyTrend,
  });
});

module.exports = router;
