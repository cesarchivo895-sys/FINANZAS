const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

router.get('/', async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const recommendations = [];

  try {
    const { data: currentMonthExpenses } = await supabase
      .from('expenses').select('amount')
      .eq('user_id', userId).eq('type', 'expense')
      .gte('date', currentMonth).lt('date', nextMonth);

    const { data: lastMonthExpenses } = await supabase
      .from('expenses').select('amount')
      .eq('user_id', userId).eq('type', 'expense')
      .gte('date', lastMonth).lt('date', currentMonth);

    const { data: currentMonthIncome } = await supabase
      .from('expenses').select('amount')
      .eq('user_id', userId).eq('type', 'income')
      .gte('date', currentMonth).lt('date', nextMonth);

    const totalCurrentExpenses = (currentMonthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalLastExpenses = (lastMonthExpenses || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalCurrentIncome = (currentMonthIncome || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const savingsRate = totalCurrentIncome > 0 ? ((totalCurrentIncome - totalCurrentExpenses) / totalCurrentIncome) * 100 : 0;

    if (totalCurrentExpenses > totalLastExpenses && totalLastExpenses > 0) {
      const increase = ((totalCurrentExpenses - totalLastExpenses) / totalLastExpenses) * 100;
      recommendations.push({
        type: 'warning', title: 'Gasto mensual aumentó',
        message: `Has gastado un ${increase.toFixed(1)}% más que el mes pasado. Considera revisar tus gastos discrecionales.`, icon: '⚠️',
      });
    }

    if (savingsRate < 20 && totalCurrentIncome > 0) {
      recommendations.push({
        type: 'info', title: 'Baja tasa de ahorro',
        message: `Tu tasa de ahorro es del ${savingsRate.toFixed(1)}%. Se recomienda ahorrar al menos el 20% de tus ingresos.`, icon: '💡',
      });
    }

    const { data: categoryData } = await supabase
      .from('expenses')
      .select(`amount, categories(name, icon)`)
      .eq('user_id', userId).eq('type', 'expense')
      .gte('date', currentMonth).lt('date', nextMonth);

    const categoryMap = {};
    (categoryData || []).forEach(e => {
      const catName = e.categories?.name || 'Otros';
      const catIcon = e.categories?.icon || '📦';
      if (!categoryMap[catName]) categoryMap[catName] = { name: catName, icon: catIcon, total: 0 };
      categoryMap[catName].total += parseFloat(e.amount);
    });

    const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    if (categories.length > 0) {
      const topCategory = categories[0];
      const topPercentage = (topCategory.total / totalCurrentExpenses) * 100;
      if (topPercentage > 30) {
        recommendations.push({
          type: 'info', title: `Mayor gasto en ${topCategory.name}`,
          message: `${topCategory.icon} ${topCategory.name} representa el ${topPercentage.toFixed(1)}% de tus gastos este mes.`, icon: '📊',
        });
      }
    }

    const { data: budgets } = await supabase
      .from('budgets')
      .select(`*, categories(name, icon)`)
      .eq('user_id', userId)
      .gte('end_date', now.toISOString().split('T')[0]);

    for (const budget of (budgets || [])) {
      let spentQuery = supabase.from('expenses').select('amount')
        .eq('user_id', userId).eq('type', 'expense')
        .gte('date', budget.start_date).lte('date', budget.end_date);
      if (budget.category_id) spentQuery = spentQuery.eq('category_id', budget.category_id);

      const { data: spentData } = await spentQuery;
      const spent = (spentData || []).reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      if (percentage > 90) {
        recommendations.push({
          type: 'critical', title: `Presupuesto casi agotado: ${budget.categories?.name || 'General'}`,
          message: `${budget.categories?.icon || '⚠️'} Has usado el ${percentage.toFixed(1)}% de tu presupuesto ${budget.period}.`, icon: '🚨',
        });
      }
    }

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyAverage = totalCurrentExpenses / daysInMonth;
    const remainingDays = daysInMonth - now.getDate();
    const projectedMonthly = totalCurrentExpenses + (dailyAverage * remainingDays);

    recommendations.push({
      type: 'info', title: 'Proyección mensual',
      message: `Al ritmo actual, gastarás aproximadamente ${projectedMonthly.toFixed(2)} este mes. Promedio diario: ${dailyAverage.toFixed(2)}.`, icon: '📈',
    });

    const { data: recurring } = await supabase
      .from('expenses')
      .select(`*, categories(name)`)
      .eq('user_id', userId).eq('recurring', true);

    if (recurring && recurring.length > 0) {
      const totalRecurring = recurring.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      recommendations.push({
        type: 'info', title: 'Gastos recurrentes',
        message: `Tienes ${recurring.length} gastos recurrentes que suman ${totalRecurring.toFixed(2)} por período.`, icon: '🔄',
      });
    }

    res.json({
      recommendations,
      summary: {
        currentMonthExpenses: totalCurrentExpenses,
        lastMonthExpenses: totalLastExpenses,
        currentMonthIncome: totalCurrentIncome,
        savingsRate,
        dailyAverage,
        projectedMonthly,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
