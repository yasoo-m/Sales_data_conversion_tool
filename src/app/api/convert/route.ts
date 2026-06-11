import { NextRequest, NextResponse } from 'next/server';
import { getConverter } from '@/lib/converters';
import { parseFile } from '@/lib/csv-parser';
import type { MallType, BrandType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mall = formData.get('mall') as MallType;
    const brand = formData.get('brand') as BrandType;

    if (!file || !mall || !brand) {
      return NextResponse.json({ error: 'ファイル、モール、ブランドは必須です' }, { status: 400 });
    }

    const converter = getConverter(mall);
    if (!converter) {
      return NextResponse.json({
        error: `${mall}のコンバーターは未実装です。CSVフォーマットが判明次第、追加実装します。`,
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    let rows: string[][];
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // For Excel files, use a different parser
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.worksheets[0];
      rows = [];
      sheet.eachRow((row) => {
        const vals = row.values;
        rows.push(vals ? (vals as unknown[]).slice(1).map(v => String(v ?? '')) : []);
      });
    } else {
      rows = parseFile(buffer, filename);
    }

    if (rows.length <= 1) {
      return NextResponse.json({ error: 'データが空です（ヘッダー行のみ）' }, { status: 400 });
    }

    const result = await converter(rows, brand);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({
      error: `変換中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}
