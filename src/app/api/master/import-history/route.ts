import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';

export async function GET() {
  const db = await ensureInit();
  const result = await db.execute(
    'SELECT id, category, file_name, record_count, imported_at FROM import_history ORDER BY imported_at DESC LIMIT 50'
  );
  return NextResponse.json(result.rows);
}
