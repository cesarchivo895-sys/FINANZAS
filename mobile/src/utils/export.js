import { Share, Alert } from 'react-native';

function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}

export function exportToCSV(expenses, currency = 'USD') {
  const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'];
  const rows = expenses.map(e => [
    formatDate(e.date),
    e.type === 'expense' ? 'Gasto' : 'Ingreso',
    e.categories?.name || 'Sin categoría',
    e.description || '',
    e.type === 'expense' ? `-${e.amount}` : e.amount.toString(),
  ]);

  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  rows.push([]);
  rows.push(['', '', 'Total Ingresos', '', formatCurrency(totalIncome, currency)]);
  rows.push(['', '', 'Total Gastos', '', `-${formatCurrency(totalExpenses, currency)}`]);
  rows.push(['', '', 'Balance', '', formatCurrency(totalIncome - totalExpenses, currency)]);

  const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

  return csvContent;
}

export async function shareCSV(expenses, currency = 'USD') {
  try {
    const csv = exportToCSV(expenses, currency);
    const filename = `finanzas_${new Date().toISOString().split('T')[0]}.csv`;

    await Share.share({
      title: 'Exportar Finanzas',
      message: csv,
    });
  } catch (error) {
    Alert.alert('Error', 'No se pudo compartir el archivo');
  }
}

export async function shareSummary(expenses, summary, currency = 'USD') {
  const totalExpenses = summary?.total_expenses || 0;
  const totalIncome = summary?.total_income || 0;
  const balance = totalIncome - totalExpenses;

  let text = `📊 Resumen Financiero\n`;
  text += `📅 ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}\n\n`;
  text += `💰 Ingresos: ${formatCurrency(totalIncome, currency)}\n`;
  text += `💸 Gastos: ${formatCurrency(totalExpenses, currency)}\n`;
  text += `📈 Balance: ${formatCurrency(balance, currency)}\n\n`;

  if (summary?.byCategory?.length > 0) {
    text += `📂 Gastos por categoría:\n`;
    summary.byCategory.slice(0, 5).forEach(cat => {
      const percent = totalExpenses > 0 ? ((cat.total / totalExpenses) * 100).toFixed(1) : 0;
      text += `  ${cat.icon || '📦'} ${cat.name}: ${formatCurrency(cat.total, currency)} (${percent}%)\n`;
    });
  }

  try {
    await Share.share({
      title: 'Resumen Financiero',
      message: text,
    });
  } catch (error) {
    Alert.alert('Error', 'No se pudo compartir el resumen');
  }
}

export async function generateReport(expenses, currency = 'USD') {
  const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const categoryMap = {};
  expenses.filter(e => e.type === 'expense').forEach(e => {
    const catName = e.categories?.name || 'Sin categoría';
    const catIcon = e.categories?.icon || '📦';
    if (!categoryMap[catName]) categoryMap[catName] = { icon: catIcon, total: 0, count: 0 };
    categoryMap[catName].total += parseFloat(e.amount);
    categoryMap[catName].count += 1;
  });

  const dailyMap = {};
  expenses.forEach(e => {
    if (!dailyMap[e.date]) dailyMap[e.date] = { expenses: 0, income: 0 };
    if (e.type === 'expense') dailyMap[e.date].expenses += parseFloat(e.amount);
    else dailyMap[e.date].income += parseFloat(e.amount);
  });

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    categories: Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total),
    daily: Object.entries(dailyMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    transactionCount: expenses.length,
    averageDaily: totalExpenses / Object.keys(dailyMap).length,
  };
}
