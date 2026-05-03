const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const { status, priority } = req.query;
  let query = supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const goalsWithProgress = data.map(goal => ({
    ...goal,
    progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
    remaining: goal.target_amount - goal.current_amount,
  }));

  res.json(goalsWithProgress);
});

router.get('/:id', async (req, res) => {
  const { data: goal, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });

  const { data: contributions, error: contribError } = await supabase
    .from('savings_contributions')
    .select('*')
    .eq('goal_id', goal.id)
    .order('date', { ascending: false });

  if (contribError) return res.status(500).json({ error: contribError.message });

  res.json({
    ...goal,
    progress: goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0,
    remaining: goal.target_amount - goal.current_amount,
    contributions: contributions || [],
  });
});

router.post('/', async (req, res) => {
  const { name, icon, color, target_amount, deadline, priority, notes } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'name y target_amount son requeridos' });

  const { data, error } = await supabase
    .from('savings_goals')
    .insert([{
      name,
      icon: icon || '🎯',
      color: color || '#6C63FF',
      target_amount: parseFloat(target_amount),
      current_amount: 0,
      deadline: deadline || null,
      priority: priority || 'medium',
      notes: notes || null,
      user_id: req.user.id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { name, icon, color, target_amount, deadline, priority, status, notes } = req.body;
  const { data, error } = await supabase
    .from('savings_goals')
    .update({ name, icon, color, target_amount, deadline, priority, status, notes, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Meta eliminada' });
});

router.post('/:id/contribute', async (req, res) => {
  const { amount, date, note } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount es requerido' });

  const { data: goal, error: goalError } = await supabase
    .from('savings_goals')
    .select('current_amount, target_amount')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (goalError) return res.status(500).json({ error: goalError.message });
  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });

  const newCurrentAmount = goal.current_amount + parseFloat(amount);

  const { data: contribution, error: contribError } = await supabase
    .from('savings_contributions')
    .insert([{
      goal_id: req.params.id,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      note: note || null,
    }])
    .select()
    .single();

  if (contribError) return res.status(500).json({ error: contribError.message });

  await supabase
    .from('savings_goals')
    .update({ current_amount: newCurrentAmount, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  const newGoal = {
    ...goal,
    current_amount: newCurrentAmount,
    progress: goal.target_amount > 0 ? (newCurrentAmount / goal.target_amount) * 100 : 0,
  };

  res.status(201).json({ contribution, goal: newGoal });
});

router.delete('/:id/contributions/:contributionId', async (req, res) => {
  const { data: contribution, error: contribError } = await supabase
    .from('savings_contributions')
    .select('amount')
    .eq('id', req.params.contributionId)
    .eq('goal_id', req.params.id)
    .single();

  if (contribError) return res.status(500).json({ error: contribError.message });
  if (!contribution) return res.status(404).json({ error: 'Contribución no encontrada' });

  const { error: deleteError } = await supabase
    .from('savings_contributions')
    .delete()
    .eq('id', req.params.contributionId)
    .eq('goal_id', req.params.id);

  if (deleteError) return res.status(500).json({ error: deleteError.message });

  await supabase.rpc('decrement_savings_goal', {
    goal_id: req.params.id,
    amount_to_subtract: contribution.amount,
  });

  res.json({ message: 'Contribución eliminada' });
});

router.get('/summary', async (req, res) => {
  const { data: goals, error } = await supabase
    .from('savings_goals')
    .select('target_amount, current_amount, status')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount), 0);
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;

  res.json({
    totalTarget,
    totalSaved,
    totalProgress: totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0,
    activeGoals,
    completedGoals,
  });
});

module.exports = router;
