import { NextRequest, NextResponse } from 'next/server';
import { generateExcel } from '@/lib/excel-export';
import { buildExcelFileName } from '@/lib/filename';
import type { BrandType, MallType, UnifiedRow } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { rows, brand, mall } = await request.json() as {
      rows: UnifiedRow[];
      brand: BrandType;
      mall: MallType;
    };

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'データがありません' }, { status: 400 });
    }

    const buffer = await generateExcel(rows);
    const fileName = buildExcelFileName({ rows, brand, mall });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // 日本語ファイル名は filename= に直接書けないため RFC 5987 形式を併記する
        'Content-Disposition': `attachment; filename="sales_data.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Excel生成エラー' }, { status: 500 });
  }
}
