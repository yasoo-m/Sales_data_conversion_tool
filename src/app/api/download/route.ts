import { NextRequest, NextResponse } from 'next/server';
import { generateExcel } from '@/lib/excel-export';
import type { UnifiedRow } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { rows } = await request.json() as { rows: UnifiedRow[] };

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'データがありません' }, { status: 400 });
    }

    const buffer = await generateExcel(rows);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sales_data_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Excel生成エラー' }, { status: 500 });
  }
}
