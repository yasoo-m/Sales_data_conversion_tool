import { ensureInit } from '../db';
import type { PostalCodeEntry } from '../types';

export async function lookupPostalCode(postalCode: string): Promise<PostalCodeEntry | null> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT postal_code as postalCode, prefecture, city FROM postal_codes WHERE postal_code = ?',
    args: [postalCode],
  });
  if (result.rows.length > 0) {
    return result.rows[0] as unknown as PostalCodeEntry;
  }
  return null;
}

export async function clearPostalCodes(): Promise<void> {
  const db = await ensureInit();
  await db.execute('DELETE FROM postal_codes');
}

export async function searchPostalCodes(query: string): Promise<{ postal_code: string; prefecture: string; city: string }[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT postal_code, prefecture, city FROM postal_codes WHERE postal_code LIKE ? OR prefecture LIKE ? OR city LIKE ? ORDER BY postal_code LIMIT 200',
    args: [`%${query}%`, `%${query}%`, `%${query}%`],
  });
  return result.rows as unknown as { postal_code: string; prefecture: string; city: string }[];
}

export async function importPostalCodes(rows: string[][]): Promise<number> {
  const db = await ensureInit();
  // Clear existing postal codes before import
  await db.execute('DELETE FROM postal_codes');
  const stmts = [];
  for (const row of rows) {
    if (row.length >= 8) {
      const postalCode = row[2]?.trim().replace(/"/g, '');
      const prefecture = row[6]?.trim().replace(/"/g, '');
      const city = row[7]?.trim().replace(/"/g, '');
      if (postalCode && prefecture) {
        stmts.push({
          sql: 'INSERT OR REPLACE INTO postal_codes (postal_code, prefecture, city) VALUES (?, ?, ?)',
          args: [postalCode, prefecture, city],
        });
      }
    }
  }
  if (stmts.length > 0) {
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100));
    }
  }
  return stmts.length;
}

export async function getAllPostalCodes(limit = 200): Promise<{ postal_code: string; prefecture: string; city: string }[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT postal_code, prefecture, city FROM postal_codes ORDER BY postal_code LIMIT ?',
    args: [limit],
  });
  return result.rows as unknown as { postal_code: string; prefecture: string; city: string }[];
}

export async function getPostalCodeCount(): Promise<number> {
  const db = await ensureInit();
  const result = await db.execute('SELECT COUNT(*) as cnt FROM postal_codes');
  return (result.rows[0] as unknown as { cnt: number }).cnt;
}
