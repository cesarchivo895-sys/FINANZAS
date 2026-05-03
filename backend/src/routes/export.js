const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/csv', async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const userId = req.user.id;

  let query = supabase
    .from('expenses')
    .select(`*, categories(name, icon, color)`)
    .eq('user_id', userId)
    .order('date', { ascending: false });

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
  if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
  const rows = data.map(e => [
    e.date,
    e.type === 'expense' ? 'Gasto' : 'Ingreso',
    e.categories?.name || 'Sin categoría',
    e.description || '',
    e.type === 'expense' ? -Math.abs(e.amount) : Math.abs(e.amount),
  ]);

  const totalExpenses = data.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = data.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  rows.push([]);
  rows.push(['', '', 'Total Ingresos', '', totalIncome]);
  rows.push(['', '', 'Total Gastos', '', -totalExpenses]);
  rows.push(['', '', 'Balance', '', totalIncome - totalExpenses]);

  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="finanzas_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send('\ufeff' + csv);
});

router.get('/report', async (req, res) => {
  const { period, startDate, endDate } = req.query;
  const userId = req.user.id;

  let query = supabase
    .from('expenses')
    .select(`*, categories(name, icon, color)`)
    .eq('user_id', userId)
    .order('date', { ascending: false });

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
  if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const totalExpenses = data.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = data.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const categoryMap = {};
  data.filter(e => e.type === 'expense').forEach(e => {
    const name = e.categories?.name || 'Sin categoría';
    const icon = e.categories?.icon || '📦';
    if (!categoryMap[name]) categoryMap[name] = { icon, total: 0, count: 0 };
    categoryMap[name].total += parseFloat(e.amount);
    categoryMap[name].count++;
  });

  const categories = Object.entries(categoryMap)
    .map(([name, d]) => ({ name, ...d, percentage: totalExpenses > 0 ? (d.total / totalExpenses * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.total - a.total);

  const dailyMap = {};
  data.forEach(e => {
    if (!dailyMap[e.date]) dailyMap[e.date] = { expenses: 0, income: 0 };
    if (e.type === 'expense') dailyMap[e.date].expenses += parseFloat(e.amount);
    else dailyMap[e.date].income += parseFloat(e.amount);
  });

  const daily = Object.entries(dailyMap)
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date();
  const projectedMonthly = totalExpenses / (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());

  const recommendations = [];
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0;

  if (savingsRate < 20 && totalIncome > 0) {
    recommendations.push({ type: 'warning', text: `Tu tasa de ahorro es ${savingsRate.toFixed(1)}%. Se recomienda al menos 20%.` });
  }
  if (categories.length > 0 && categories[0].percentage > 30) {
    recommendations.push({ type: 'info', text: `${categories[0].name} representa el ${categories[0].percentage}% de tus gastos.` });
  }
  if (projectedMonthly > totalIncome) {
    recommendations.push({ type: 'critical', text: `Proyección mensual ($${projectedMonthly.toFixed(0)}) supera tus ingresos.` });
  }

  res.json({
    period: period || 'personalizado',
    generatedAt: new Date().toISOString(),
    summary: { totalExpenses, totalIncome, balance: totalIncome - totalExpenses, savingsRate, projectedMonthly },
    categories,
    daily,
    transactionCount: data.length,
    recommendations,
  });
});

module.exports = router;
