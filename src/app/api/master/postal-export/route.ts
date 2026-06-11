import { NextResponse } from 'next/server';
import { getAllPostalCodes } from '@/lib/masters/postal-code';

export async function GET() {
  const codes = await getAllPostalCodes(999999);
  const csv = [
    '郵便番号,都道府県,市区町村',
    ...codes.map(c => `${c.postal_code},${c.prefecture},${c.city}`),
  ].join('\r\n');

  const bom = '\uFEFF';

  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="postal_codes.csv"',
    },
  });
}
