import { NextRequest, NextResponse } from 'next/server';

const SAMPLES: Record<string, { filename: string; content: string }> = {
  'product-codes': {
    filename: 'sample_product_codes.csv',
    content: [
      '旧コード,新コード,商品名',
      'OLD-001,NEW-001,サンプル商品A',
      'OLD-002,NEW-002,サンプル商品B',
      'OLD-003,NEW-003,サンプル商品C',
    ].join('\r\n'),
  },
  'payment-methods': {
    filename: 'sample_payment_methods.csv',
    content: [
      '旧名称,新名称',
      'クレジットカード決済,クレジットカード',
      '銀行振込(前払い),銀行振込',
      '代金引換,代引き',
    ].join('\r\n'),
  },
  cost: {
    filename: 'sample_cost.csv',
    content: [
      '商品コード,原価',
      'ITEM-001,500',
      'ITEM-002,1200',
      'ITEM-003,300',
    ].join('\r\n'),
  },
  postal: {
    filename: 'sample_postal_kenall.csv',
    content: [
      '01101,"060  ","0600000","ホッカイドウ","サッポロシチュウオウク","イカニケイサイガナイバアイ","北海道","札幌市中央区","以下に掲載がない場合",0,0,0,0,0,0',
      '13101,"100  ","1000001","トウキョウト","チヨダク","チヨダ","東京都","千代田区","千代田",0,0,1,0,0,0',
      '27102,"530  ","5300001","オオサカフ","オオサカシキタク","ウメダ","大阪府","大阪市北区","梅田",0,0,1,0,0,0',
    ].join('\r\n'),
  },
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type');
  if (!type || !SAMPLES[type]) {
    return NextResponse.json({ error: '不正なタイプです' }, { status: 400 });
  }

  const sample = SAMPLES[type];
  const bom = '\uFEFF';
  const body = bom + sample.content;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sample.filename}"`,
    },
  });
}
