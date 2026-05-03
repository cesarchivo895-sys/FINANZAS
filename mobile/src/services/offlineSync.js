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
      status TEXT DEFAULT 'pending',
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

  for (const sync of pendingSyncs) {
    try {
      if (sync.action === 'upsert') {
        const database = await getDb();
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
          await markSynced(sync.id);
          synced++;
        }
      } else if (sync.action === 'delete') {
        await supabase.from('expenses').delete().eq('id', sync.record_id);
        await markSynced(sync.id);
        synced++;
      }
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
