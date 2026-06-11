import { NextRequest, NextResponse } from 'next/server';
import { importPostalCodes, getPostalCodeCount, getAllPostalCodes, searchPostalCodes } from '@/lib/masters/postal-code';
import { parseFile } from '@/lib/csv-parser';
import { recordImport } from '@/lib/db';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const list = request.nextUrl.searchParams.get('list');

  if (list === 'true') {
    const data = query ? await searchPostalCodes(query) : await getAllPostalCodes();
    const count = await getPostalCodeCount();
    return NextResponse.json({ items: data, count });
  }

  const count = await getPostalCodeCount();
  return NextResponse.json({ count });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'KEN_ALL.CSVファイルが必要です' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseFile(buffer, file.name);
    const count = await importPostalCodes(rows);
    await recordImport('郵便番号データ', file.name, count);

    return NextResponse.json({ imported: count });
  } catch (error) {
    console.error('Postal code import error:', error);
    return NextResponse.json({ error: '郵便番号データのインポートに失敗しました' }, { status: 500 });
  }
}
