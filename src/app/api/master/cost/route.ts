import { NextRequest, NextResponse } from 'next/server';
import { importCosts, getCostCount, getAllCosts, searchCosts } from '@/lib/masters/cost';
import { parseFile } from '@/lib/csv-parser';
import { recordImport } from '@/lib/db';

export async function GET(request: NextRequest) {
  const brandType = request.nextUrl.searchParams.get('brandType') as 'parts' | 'maqs' | null;
  const query = request.nextUrl.searchParams.get('q');

  if (brandType) {
    const data = query ? await searchCosts(brandType, query) : await getAllCosts(brandType);
    const parts = await getCostCount('parts');
    const maqs = await getCostCount('maqs');
    return NextResponse.json({ items: data, parts, maqs, total: parts + maqs });
  }

  const parts = await getCostCount('parts');
  const maqs = await getCostCount('maqs');
  return NextResponse.json({ parts, maqs, total: parts + maqs });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brandType = formData.get('brandType') as 'parts' | 'maqs';

    if (!file || !brandType) {
      return NextResponse.json({ error: 'ファイルとブランド種別が必要です' }, { status: 400 });
    }

    if (brandType !== 'parts' && brandType !== 'maqs') {
      return NextResponse.json({ error: 'ブランド種別が不正です' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseFile(buffer, file.name);

    const dataRows = rows.length > 0 && isNaN(parseInt(rows[0][1])) ? rows.slice(1) : rows;
    const count = await importCosts(dataRows, brandType);
    const label = brandType === 'parts' ? '原価データ（パーツ）' : '原価データ（MAQs）';
    await recordImport(label, file.name, count);

    return NextResponse.json({ imported: count, brandType });
  } catch (error) {
    console.error('Cost import error:', error);
    return NextResponse.json({ error: '原価データのインポートに失敗しました' }, { status: 500 });
  }
}
