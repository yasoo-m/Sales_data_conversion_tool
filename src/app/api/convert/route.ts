import { NextRequest, NextResponse } from 'next/server';
import { getConverter } from '@/lib/converters';
import { parseFile } from '@/lib/csv-parser';
import { CANCEL_SUPPORTED_MALLS, MALL_LABELS } from '@/lib/types';
import type { MallType, BrandType } from '@/lib/types';

async function readRows(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;

  if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    // For Excel files, use a different parser
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const vals = row.values;
      rows.push(vals ? (vals as unknown[]).slice(1).map(v => String(v ?? '')) : []);
    });
    return rows;
  }

  return parseFile(buffer, filename);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mall = formData.get('mall') as MallType;
    const brand = formData.get('brand') as BrandType;
    const cancelFile = formData.get('cancelFile') as File | null;

    if (!file || !mall || !brand) {
      return NextResponse.json({ error: 'ファイル、モール、ブランドは必須です' }, { status: 400 });
    }

    const converter = getConverter(mall);
    if (!converter) {
      return NextResponse.json({
        error: `${mall}のコンバーターは未実装です。CSVフォーマットが判明次第、追加実装します。`,
      }, { status: 400 });
    }

    if (cancelFile && !CANCEL_SUPPORTED_MALLS.includes(mall)) {
      return NextResponse.json({
        error: `${MALL_LABELS[mall]}は注文キャンセルデータの取り込みに対応していません`,
      }, { status: 400 });
    }

    const rows = await readRows(file);

    if (rows.length <= 1) {
      return NextResponse.json({ error: 'データが空です（ヘッダー行のみ）' }, { status: 400 });
    }

    const cancelRows = cancelFile ? await readRows(cancelFile) : undefined;

    const result = await converter(rows, brand, cancelRows);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({
      error: `変換中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}
