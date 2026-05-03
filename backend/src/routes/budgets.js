const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const { period } = req.query;
  let query = supabase
    .from('budgets')
    .select(`
      *,
      categories (name, icon, color)
    `)
    .eq('user_id', req.user.id);

  if (period) query = query.eq('period', period);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { amount, category_id, period, start_date, end_date } = req.body;
  if (!amount || !period) return res.status(400).json({ error: 'amount y period son requeridos' });

  const now = new Date();
  const startDate = start_date || now.toISOString().split('T')[0];
  let endDate = end_date;
  if (!endDate) {
    switch (period) {
      case 'daily': endDate = startDate; break;
      case 'monthly': endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]; break;
      case 'yearly': endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]; break;
    }
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert([{
      amount: parseFloat(amount),
      category_id: category_id || null,
      user_id: req.user.id,
      period,
      start_date: startDate,
      end_date: endDate,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { amount, category_id, period, start_date, end_date } = req.body;
  const { data, error } = await supabase
    .from('budgets')
    .update({ amount, category_id, period, start_date, end_date })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Presupuesto eliminado' });
});

router.get('/status', async (req, res) => {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select(`
      *,
      categories (name, icon, color)
    `)
    .eq('user_id', req.user.id)
    .gte('end_date', new Date().toISOString().split('T')[0]);

  if (error) return res.status(500).json({ error: error.message });

  const status = [];
  for (const budget of budgets) {
    let spentQuery = supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', req.user.id)
      .eq('type', 'expense')
      .gte('date', budget.start_date)
      .lte('date', budget.end_date);

    if (budget.category_id) spentQuery = spentQuery.eq('category_id', budget.category_id);

    const { data: spentData, error: spentError } = await spentQuery;
    if (spentError) {
      console.error('Error calculating spent:', spentError);
      continue;
    }

    const spent = spentData.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    status.push({
      ...budget,
      spent,
      remaining: budget.amount - spent,
      percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
    });
  }

  res.json(status);
});

module.exports = router;
