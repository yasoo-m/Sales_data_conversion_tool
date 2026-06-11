import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseDate, parseNumber, taxExclude, resolveProductCode, resolveCost, resolvePaymentMethod, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// Rakuten CSV columns (0-indexed):
// A(0): 注文番号, F(5): 注文日, M(12): 支払方法名
// AB(27): 送料合計, AC(28): 代引料合計
// BG(58): 送付先郵便番号1, BH(59): 送付先郵便番号2
// BI(60): 都道府県, BJ(61): 市町村
// BV(73): 商品番号, BX(75): 単価, BY(76): 個数
// FA(156): システム連携用SKU番号

export async function convertRakuten(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  await loadMasterCaches();
  try {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 77) continue;

      try {
        const orderNumber = row[0]?.trim() || '';
        const orderDate = row[5]?.trim() || '';
        const payMethod = row[12]?.trim() || '';
        const shippingTotal = parseNumber(row[27]);
        const codFee = parseNumber(row[28]);
        const postal1 = row[58]?.trim() || '';
        const postal2 = row[59]?.trim() || '';
        const prefecture = row[60]?.trim() || '';
        const city = row[61]?.trim() || '';
        const productNumber = row[73]?.trim() || '';
        const unitPrice = parseNumber(row[75]);
        const quantity = parseInt(row[76]?.trim() || '0', 10);
        const skuNumber = row.length > 156 ? (row[156]?.trim() || '') : '';

        const date = parseDate(orderDate);
        const postalCode = (postal1 + postal2).replace(/-/g, '');

        // SKU priority: FA column first, then BV column
        const rawCode = skuNumber || productNumber;
        const productCode = resolveProductCode(rawCode);
        const costPrice = resolveCost(productCode, brand, i, warnings);

        // Shipping fee: (送料合計 + 代引料合計) / 1.1 for tax exclusion
        const shippingFee = taxExclude(shippingTotal + codFee);

        const paymentMethod = resolvePaymentMethod(payMethod);

        if (quantity === 0) {
          warnings.push({ row: i + 1, column: 'M', message: '受注数が0です', type: 'quantity_zero' });
        }

        resultRows.push(buildRow({
          date,
          postalCode,
          prefecture,
          city,
          orderNumber,
          memberNumber: '',
          storeName: getStoreName(brand, 'rakuten'),
          productCode,
          costPrice,
          subtotal: unitPrice,
          quantity,
          shippingFee,
          paymentMethod,
        }));
      } catch (e) {
        errors.push({ row: i + 1, column: '', message: `行の処理中にエラー: ${e}`, type: 'parse_error' });
      }
    }
  } finally {
    clearMasterCaches();
  }

  return { rows: resultRows, warnings, errors };
}
