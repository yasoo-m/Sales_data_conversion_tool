import { ensureInit } from '../db';
import type { ProductCodeMapping } from '../types';

function cleanCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export async function getAllProductCodes(): Promise<ProductCodeMapping[]> {
  const db = await ensureInit();
  const result = await db.execute('SELECT id, old_code as oldCode, new_code as newCode, product_name as productName FROM product_codes ORDER BY id');
  return result.rows as unknown as ProductCodeMapping[];
}

export async function searchProductCodes(query: string): Promise<ProductCodeMapping[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT id, old_code as oldCode, new_code as newCode, product_name as productName FROM product_codes WHERE old_code LIKE ? OR new_code LIKE ? OR product_name LIKE ? ORDER BY id',
    args: [`%${query}%`, `%${query}%`, `%${query}%`],
  });
  return result.rows as unknown as ProductCodeMapping[];
}

export async function addProductCode(mapping: ProductCodeMapping): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'INSERT INTO product_codes (old_code, new_code, product_name) VALUES (?, ?, ?)',
    args: [cleanCode(mapping.oldCode), cleanCode(mapping.newCode), mapping.productName || ''],
  });
}

export async function updateProductCode(id: number, mapping: Partial<ProductCodeMapping>): Promise<void> {
  const db = await ensureInit();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (mapping.oldCode !== undefined) { fields.push('old_code = ?'); values.push(mapping.oldCode); }
  if (mapping.newCode !== undefined) { fields.push('new_code = ?'); values.push(mapping.newCode); }
  if (mapping.productName !== undefined) { fields.push('product_name = ?'); values.push(mapping.productName); }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.execute({ sql: `UPDATE product_codes SET ${fields.join(', ')} WHERE id = ?`, args: values });
}

export async function deleteProductCode(id: number): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'DELETE FROM product_codes WHERE id = ?', args: [id] });
}

export async function importProductCodes(rows: string[][]): Promise<number> {
  const db = await ensureInit();
  const stmts = [];
  for (const row of rows) {
    if (row.length >= 2 && row[0].trim()) {
      stmts.push({
        sql: 'INSERT INTO product_codes (old_code, new_code, product_name) VALUES (?, ?, ?)',
        args: [cleanCode(row[0].trim()), cleanCode(row[1].trim()), row[2]?.trim() || ''],
      });
    }
  }
  if (stmts.length > 0) {
    // batch in chunks of 100 to avoid limits
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100));
    }
  }
  return stmts.length;
}

export async function clearProductCodes(): Promise<void> {
  const db = await ensureInit();
  await db.execute('DELETE FROM product_codes');
}

export async function replaceProductCode(code: string): Promise<string> {
  const db = await ensureInit();
  const result = await db.execute({ sql: 'SELECT new_code FROM product_codes WHERE old_code = ?', args: [code] });
  if (result.rows.length > 0) {
    return (result.rows[0] as unknown as { new_code: string }).new_code;
  }
  return code;
}
