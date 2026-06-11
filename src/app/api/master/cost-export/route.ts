import { NextRequest, NextResponse } from 'next/server';
import { getAllCosts } from '@/lib/masters/cost';

export async function GET(request: NextRequest) {
  const brandType = request.nextUrl.searchParams.get('brandType') as 'parts' | 'maqs';
  if (brandType !== 'parts' && brandType !== 'maqs') {
    return NextResponse.json({ error: 'ブランド種別が不正です' }, { status: 400 });
  }

  const costs = await getAllCosts(brandType, 999999);
  const csv = [
    '商品コード,原価',
    ...costs.map(c => `${c.product_code},${c.cost}`),
  ].join('\r\n');

  const label = brandType === 'parts' ? 'parts_cost' : 'maqs_cost';
  const bom = '\uFEFF';

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${label}.csv"`,
    },
  });
}
