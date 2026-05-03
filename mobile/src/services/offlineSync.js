import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';
import { supabase } from './supabase';

let db;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('finanzas-offline.db');
    await initOfflineDb();
  }
  return db;
}

async function initOfflineDb() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pending_expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      description TEXT,
      category_id TEXT,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'expense',
      user_id TEXT,
      recurring INTEGER DEFAULT 0,
      recurring_interval TEXT,
      sync_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pending_budgets (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category_id TEXT,
      period TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      user_id TEXT,
      sync_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS pending_savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'active',
      notes TEXT,
      user_id TEXT,
      sync_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS pending_contributions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      sync_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS cached_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      is_default INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL,
      record_id TEXT,
      sync_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function isOnline() {
  try {
    const network = await Network.getNetworkStateAsync();
    return network.isConnected && network.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function saveExpenseOffline(expense) {
  const database = await getDb();
  const id = expense.id || `offline_${Date.now()}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_expenses (id, amount, description, category_id, date, type, user_id, recurring, recurring_interval, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, expense.amount, expense.description, expense.category_id, expense.date, expense.type || 'expense', expense.user_id, expense.recurring ? 1 : 0, expense.recurring_interval]
  );
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('expenses', 'upsert', ?)`,
    [id]
  );
  return id;
}

export async function deleteExpenseOffline(id) {
  const database = await getDb();
  await database.runAsync(`DELETE FROM pending_expenses WHERE id = ?`, [id]);
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('expenses', 'delete', ?)`,
    [id]
  );
}

export async function saveBudgetOffline(budget) {
  const database = await getDb();
  const id = budget.id || `offline_${Date.now()}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_budgets (id, amount, category_id, period, start_date, end_date, user_id, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, budget.amount, budget.category_id, budget.period, budget.start_date, budget.end_date, budget.user_id]
  );
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('budgets', 'upsert', ?)`,
    [id]
  );
  return id;
}

export async function deleteBudgetOffline(id) {
  const database = await getDb();
  await database.runAsync(`DELETE FROM pending_budgets WHERE id = ?`, [id]);
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('budgets', 'delete', ?)`,
    [id]
  );
}

export async function saveSavingsGoalOffline(goal) {
  const database = await getDb();
  const id = goal.id || `offline_${Date.now()}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_savings_goals (id, name, icon, color, target_amount, current_amount, deadline, priority, status, notes, user_id, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, goal.name, goal.icon, goal.color, goal.target_amount, goal.current_amount || 0, goal.deadline, goal.priority || 'medium', goal.status || 'active', goal.notes, goal.user_id]
  );
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('savings_goals', 'upsert', ?)`,
    [id]
  );
  return id;
}

export async function deleteSavingsGoalOffline(id) {
  const database = await getDb();
  await database.runAsync(`DELETE FROM pending_savings_goals WHERE id = ?`, [id]);
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('savings_goals', 'delete', ?)`,
    [id]
  );
}

export async function saveContributionOffline(contribution) {
  const database = await getDb();
  const id = contribution.id || `offline_${Date.now()}`;
  await database.runAsync(
    `INSERT OR REPLACE INTO pending_contributions (id, goal_id, amount, date, note, sync_status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [id, contribution.goal_id, contribution.amount, contribution.date, contribution.note]
  );
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('savings_contributions', 'upsert', ?)`,
    [id]
  );
  return id;
}

export async function deleteContributionOffline(id) {
  const database = await getDb();
  await database.runAsync(`DELETE FROM pending_contributions WHERE id = ?`, [id]);
  await database.runAsync(
    `INSERT INTO sync_log (table_name, action, record_id) VALUES ('savings_contributions', 'delete', ?)`,
    [id]
  );
}

export async function getPendingSyncs() {
  const database = await getDb();
  const rows = await database.getAllAsync(`SELECT * FROM sync_log WHERE status = 'pending' ORDER BY created_at ASC`);
  return rows;
}

export async function markSynced(syncId) {
  const database = await getDb();
  await database.runAsync(`UPDATE sync_log SET status = 'synced' WHERE id = ?`, [syncId]);
}

export async function getOfflineExpenses() {
  const database = await getDb();
  return await database.getAllAsync(`SELECT * FROM pending_expenses ORDER BY date DESC`);
}

export async function syncPending() {
  const online = await isOnline();
  if (!online) return { synced: 0, failed: 0 };

  const pendingSyncs = await getPendingSyncs();
  let synced = 0;
  let failed = 0;
  const database = await getDb();

  for (const sync of pendingSyncs) {
    try {
      if (sync.table_name === 'expenses') {
        if (sync.action === 'upsert') {
          const expense = await database.getFirstAsync(`SELECT * FROM pending_expenses WHERE id = ?`, [sync.record_id]);
          if (expense) {
            await supabase.from('expenses').upsert({
              id: expense.id,
              amount: expense.amount,
              description: expense.description,
              category_id: expense.category_id,
              date: expense.date,
              type: expense.type,
              recurring: !!expense.recurring,
              recurring_interval: expense.recurring_interval,
              user_id: expense.user_id,
            }, { onConflict: 'id' });
            await database.runAsync(`DELETE FROM pending_expenses WHERE id = ?`, [sync.record_id]);
          }
        } else if (sync.action === 'delete') {
          await supabase.from('expenses').delete().eq('id', sync.record_id);
        }
      } else if (sync.table_name === 'budgets') {
        if (sync.action === 'upsert') {
          const budget = await database.getFirstAsync(`SELECT * FROM pending_budgets WHERE id = ?`, [sync.record_id]);
          if (budget) {
            await supabase.from('budgets').upsert({
              id: budget.id,
              amount: budget.amount,
              category_id: budget.category_id,
              period: budget.period,
              start_date: budget.start_date,
              end_date: budget.end_date,
              user_id: budget.user_id,
            }, { onConflict: 'id' });
            await database.runAsync(`DELETE FROM pending_budgets WHERE id = ?`, [sync.record_id]);
          }
        } else if (sync.action === 'delete') {
          await supabase.from('budgets').delete().eq('id', sync.record_id);
        }
      } else if (sync.table_name === 'savings_goals') {
        if (sync.action === 'upsert') {
          const goal = await database.getFirstAsync(`SELECT * FROM pending_savings_goals WHERE id = ?`, [sync.record_id]);
          if (goal) {
            await supabase.from('savings_goals').upsert({
              id: goal.id,
              name: goal.name,
              icon: goal.icon,
              color: goal.color,
              target_amount: goal.target_amount,
              current_amount: goal.current_amount,
              deadline: goal.deadline,
              priority: goal.priority,
              status: goal.status,
              notes: goal.notes,
              user_id: goal.user_id,
            }, { onConflict: 'id' });
            await database.runAsync(`DELETE FROM pending_savings_goals WHERE id = ?`, [sync.record_id]);
          }
        } else if (sync.action === 'delete') {
          await supabase.from('savings_goals').delete().eq('id', sync.record_id);
        }
      } else if (sync.table_name === 'savings_contributions') {
        if (sync.action === 'upsert') {
          const contrib = await database.getFirstAsync(`SELECT * FROM pending_contributions WHERE id = ?`, [sync.record_id]);
          if (contrib) {
            await supabase.from('savings_contributions').upsert({
              id: contrib.id,
              goal_id: contrib.goal_id,
              amount: contrib.amount,
              date: contrib.date,
              note: contrib.note,
            }, { onConflict: 'id' });
            const goal = await supabase.from('savings_goals').select('current_amount').eq('id', contrib.goal_id).single();
            if (goal.data) {
              await supabase.from('savings_goals').update({
                current_amount: goal.data.current_amount + parseFloat(contrib.amount),
                updated_at: new Date().toISOString(),
              }).eq('id', contrib.goal_id);
            }
            await database.runAsync(`DELETE FROM pending_contributions WHERE id = ?`, [sync.record_id]);
          }
        } else if (sync.action === 'delete') {
          await supabase.from('savings_contributions').delete().eq('id', sync.record_id);
        }
      }

      await markSynced(sync.id);
      synced++;
    } catch (error) {
      console.error('Sync failed for:', sync.record_id, error);
      failed++;
    }
  }

  return { synced, failed };
}

export async function cacheCategories(categories) {
  const database = await getDb();
  await database.execAsync(`DELETE FROM cached_categories`);
  for (const cat of categories) {
    await database.runAsync(
      `INSERT INTO cached_categories (id, name, icon, color, is_default) VALUES (?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.icon, cat.color, cat.is_default ? 1 : 0]
    );
  }
}

export async function getCachedCategories() {
  const database = await getDb();
  return await database.getAllAsync(`SELECT * FROM cached_categories ORDER BY name`);
}
