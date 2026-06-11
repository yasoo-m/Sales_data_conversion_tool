import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && authToken) {
    client = createClient({ url, authToken });
  } else {
    // ローカル開発用: ファイルベースSQLite
    const dbDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    client = createClient({ url: `file:${path.join(dbDir, 'db.sqlite')}` });
  }

  return client;
}

let initialized = false;

export async function ensureInit(): Promise<Client> {
  const db = getDb();
  if (initialized) return db;

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS product_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_code TEXT NOT NULL,
      new_code TEXT NOT NULL,
      product_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_product_codes_old ON product_codes(old_code);

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      old_name TEXT NOT NULL,
      new_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payment_methods_old ON payment_methods(old_name);

    CREATE TABLE IF NOT EXISTS postal_codes (
      postal_code TEXT PRIMARY KEY,
      prefecture TEXT NOT NULL,
      city TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT NOT NULL,
      cost INTEGER NOT NULL,
      brand_type TEXT NOT NULL CHECK(brand_type IN ('parts', 'maqs'))
    );

    CREATE INDEX IF NOT EXISTS idx_costs_code_brand ON costs(product_code, brand_type);

    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      record_count INTEGER NOT NULL DEFAULT 0,
      imported_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Insert default payment methods if empty
  const count = await db.execute('SELECT COUNT(*) as cnt FROM payment_methods');
  if ((count.rows[0] as unknown as { cnt: number }).cnt === 0) {
    const defaults = [
      ['クレジットカード決済', 'クレジットカード'],
      ['ショッピングクレジット／ローン（ジャックス）', 'ショッピングクレジット／ローン'],
      ['銀行振込（前払い）', '銀行振込'],
      ['後払い決済', '後払い決済（Paid）'],
      ['PayPay残高払い', 'PayPay（残高）'],
      ['PayPay（クレジット）※旧あと払い', 'PayPayあと払い'],
      ['商品代引', '代金引換'],
      ['PayPay（クレジット）', 'PayPayクレジット'],
      ['PayPay（残高）', 'PayPay残高等'],
      ['PayPay（残高）等', 'PayPay残高等'],
      ['PayPayあと払い', 'PayPayクレジット'],
    ];
    const stmts = defaults.map(([old_name, new_name]) => ({
      sql: 'INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)',
      args: [old_name, new_name],
    }));
    await db.batch(stmts);
  }

  initialized = true;
  return db;
}

export async function recordImport(category: string, fileName: string, recordCount: number) {
  const db = await ensureInit();
  await db.execute({
    sql: 'INSERT INTO import_history (category, file_name, record_count) VALUES (?, ?, ?)',
    args: [category, fileName, recordCount],
  });
}
