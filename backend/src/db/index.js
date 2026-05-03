const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/finanzas.db');

let db;
let SQL;

async function initDb() {
  if (db) return db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  SQL = await initSqlJs();

  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } catch (e) {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  initializeTables();
  saveDb();

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function initializeTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      currency TEXT DEFAULT 'USD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(family_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS family_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      type TEXT CHECK(type IN ('expense', 'income')) DEFAULT 'expense',
      recurring BOOLEAN DEFAULT 0,
      recurring_interval TEXT CHECK(recurring_interval IN ('daily', 'weekly', 'monthly', 'yearly')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period TEXT CHECK(period IN ('daily', 'monthly', 'yearly')) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existing = db.exec('SELECT COUNT(*) as count FROM categories');
  if (!existing.length || existing[0].values[0][0] === 0) {
    const stmt = db.prepare('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)');
    const defaults = [
      ['Alimentación', '🛒', '#FF6B6B'],
      ['Transporte', '🚗', '#4ECDC4'],
      ['Vivienda', '🏠', '#45B7D1'],
      ['Entretenimiento', '🎬', '#96CEB4'],
      ['Salud', '💊', '#FFEAA7'],
      ['Educación', '📚', '#DDA0DD'],
      ['Ropa', '👕', '#98D8C8'],
      ['Servicios', '💡', '#F7DC6F'],
      ['Ahorro', '💰', '#82E0AA'],
      ['Otros', '📦', '#AEB6BF'],
    ];
    for (const [name, icon, color] of defaults) {
      stmt.run([name, icon, color]);
      stmt.free();
    }
  }

  saveDb();
}

function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

module.exports = { initDb, getDb, closeDb, saveDb };
