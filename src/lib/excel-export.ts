import ExcelJS from 'exceljs';
import type { UnifiedRow } from './types';

const HEADERS = [
  '出荷日', '出荷月', '郵便番号', '都道府県', '市町村',
  '受注番号', '会員番号', '店舗名称', '商品コード', '原価',
  '原価計', '小計', '受注数', '合計', '配送料',
  '総売上', '粗利', '支払方法',
];

export async function generateExcel(rows: UnifiedRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('売上データ');

  // Header row
  const headerRow = sheet.addRow(HEADERS);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Column widths
  const widths = [10, 12, 10, 8, 12, 18, 10, 18, 14, 10, 10, 10, 8, 10, 10, 10, 10, 16];
  widths.forEach((w, idx) => {
    sheet.getColumn(idx + 1).width = w;
  });

  // Data rows
  for (const row of rows) {
    sheet.addRow([
      row.shippingDate,
      row.shippingMonth,
      row.postalCode,
      row.prefecture,
      row.city,
      row.orderNumber,
      row.memberNumber,
      row.storeName,
      row.productCode,
      row.costPrice ?? '',
      row.costTotal ?? '',
      row.subtotal,
      row.quantity,
      row.total,
      row.shippingFee,
      row.totalSales,
      row.grossProfit ?? '',
      row.paymentMethod,
    ]);
  }

  // Set postal code column to text format
  sheet.getColumn(3).numFmt = '@';

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
