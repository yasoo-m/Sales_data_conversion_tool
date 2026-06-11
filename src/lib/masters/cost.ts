import { ensureInit } from '../db';
import type { BrandType } from '../types';

function cleanCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export async function lookupCost(productCode: string, brand: BrandType): Promise<number | null> {
  const db = await ensureInit();
  const brandType = brand === 'cllink' ? 'parts' : 'maqs';

  let result = await db.execute({
    sql: 'SELECT cost FROM costs WHERE product_code = ? AND brand_type = ?',
    args: [productCode, brandType],
  });

  // For MAQs, fallback to parts sheet if not found
  if (result.rows.length === 0 && brandType === 'maqs') {
    result = await db.execute({
      sql: 'SELECT cost FROM costs WHERE product_code = ? AND brand_type = ?',
      args: [productCode, 'parts'],
    });
  }

  if (result.rows.length > 0) {
    return Math.round((result.rows[0] as unknown as { cost: number }).cost);
  }
  return null;
}

export async function importCosts(rows: string[][], brandType: 'parts' | 'maqs'): Promise<number> {
  const db = await ensureInit();
  // Clear existing costs for this brand type
  await db.execute({ sql: 'DELETE FROM costs WHERE brand_type = ?', args: [brandType] });

  const stmts = [];
  for (const row of rows) {
    if (row.length >= 2) {
      const code = cleanCode(row[0]?.trim());
      const cost = parseInt(row[1]?.trim(), 10);
      if (code && !isNaN(cost)) {
        stmts.push({
          sql: 'INSERT INTO costs (product_code, cost, brand_type) VALUES (?, ?, ?)',
          args: [code, cost, brandType],
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

export async function getAllCosts(brandType: 'parts' | 'maqs', limit = 200): Promise<{ product_code: string; cost: number }[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT product_code, cost FROM costs WHERE brand_type = ? ORDER BY product_code LIMIT ?',
    args: [brandType, limit],
  });
  return result.rows as unknown as { product_code: string; cost: number }[];
}

export async function searchCosts(brandType: 'parts' | 'maqs', query: string): Promise<{ product_code: string; cost: number }[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT product_code, cost FROM costs WHERE brand_type = ? AND (product_code LIKE ? OR CAST(cost AS TEXT) LIKE ?) ORDER BY product_code LIMIT 200',
    args: [brandType, `%${query}%`, `%${query}%`],
  });
  return result.rows as unknown as { product_code: string; cost: number }[];
}

export async function getCostCount(brandType?: string): Promise<number> {
  const db = await ensureInit();
  if (brandType) {
    const result = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM costs WHERE brand_type = ?', args: [brandType] });
    return (result.rows[0] as unknown as { cnt: number }).cnt;
  }
  const result = await db.execute('SELECT COUNT(*) as cnt FROM costs');
  return (result.rows[0] as unknown as { cnt: number }).cnt;
}
