import { ensureInit } from '../db';
import type { PaymentMethodMapping } from '../types';

export async function getAllPaymentMethods(): Promise<PaymentMethodMapping[]> {
  const db = await ensureInit();
  const result = await db.execute('SELECT id, old_name as oldName, new_name as newName FROM payment_methods ORDER BY id');
  return result.rows as unknown as PaymentMethodMapping[];
}

export async function addPaymentMethod(mapping: PaymentMethodMapping): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)',
    args: [mapping.oldName, mapping.newName],
  });
}

export async function updatePaymentMethod(id: number, mapping: Partial<PaymentMethodMapping>): Promise<void> {
  const db = await ensureInit();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (mapping.oldName !== undefined) { fields.push('old_name = ?'); values.push(mapping.oldName); }
  if (mapping.newName !== undefined) { fields.push('new_name = ?'); values.push(mapping.newName); }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  await db.execute({ sql: `UPDATE payment_methods SET ${fields.join(', ')} WHERE id = ?`, args: values });
}

export async function deletePaymentMethod(id: number): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'DELETE FROM payment_methods WHERE id = ?', args: [id] });
}

export async function importPaymentMethods(rows: string[][]): Promise<number> {
  const db = await ensureInit();
  const stmts = [];
  for (const row of rows) {
    if (row.length >= 2 && row[0].trim()) {
      stmts.push({
        sql: 'INSERT INTO payment_methods (old_name, new_name) VALUES (?, ?)',
        args: [row[0].trim(), row[1].trim()],
      });
    }
  }
  if (stmts.length > 0) {
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100));
    }
  }
  return stmts.length;
}

export async function clearPaymentMethods(): Promise<void> {
  const db = await ensureInit();
  await db.execute('DELETE FROM payment_methods');
}

export async function replacePaymentMethod(method: string): Promise<string> {
  const db = await ensureInit();
  const result = await db.execute({ sql: 'SELECT new_name FROM payment_methods WHERE old_name = ?', args: [method] });
  if (result.rows.length > 0) {
    return (result.rows[0] as unknown as { new_name: string }).new_name;
  }
  return method;
}
