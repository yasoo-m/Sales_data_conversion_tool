import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseDate, parseNumber, taxExclude, removeHyphen, resolveProductCode, resolveCost, resolvePostalCode, resolvePaymentMethod, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// au PAYマーケット CSV columns (0-indexed):
// B(1): orderId, D(3): orderDate, E(4): itemCode
// K(10): senderZipCode, N(13): settlementName
// T(19): itemPrice (税込), W(22): unit
// Y(24): postagePrice (税込), Z(25): chargePrice (税込)

export async function convertAupay(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  await loadMasterCaches();
  try {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 26) continue;

      try {
        const orderId = row[1]?.trim() || '';
        const orderDate = row[3]?.trim() || '';
        const itemCode = row[4]?.trim() || '';
        const rawPostalCode = row[10]?.trim() || '';
        const settlementName = row[13]?.trim() || '';
        const itemPrice = parseNumber(row[19]); // 税込
        const unit = parseInt(row[22]?.trim() || '0', 10);
        const postagePrice = parseNumber(row[24]); // 税込
        const chargePrice = parseNumber(row[25]); // 税込

        // 日付: 先頭10文字で日付取得
        const date = parseDate(orderDate.substring(0, 10));
        const postalCode = removeHyphen(rawPostalCode);

        // 郵便番号から都道府県・市町村を解決
        const { prefecture, city } = resolvePostalCode(postalCode, i, warnings);

        const productCode = resolveProductCode(itemCode);
        const costPrice = resolveCost(productCode, brand, i, warnings);

        // 小計: 税込単価 ÷ 1.1
        const subtotal = taxExclude(itemPrice);
        // 配送料: (送料 + 手数料) ÷ 1.1
        const shippingFee = taxExclude(postagePrice + chargePrice);

        // 支払方法: CSVの支払方法データから取得し、支払方法入替で置換
        const paymentMethod = resolvePaymentMethod(settlementName);

        if (unit === 0) {
          warnings.push({ row: i + 1, column: 'M', message: '受注数が0です', type: 'quantity_zero' });
        }

        resultRows.push(buildRow({
          date,
          postalCode,
          prefecture,
          city,
          orderNumber: orderId,
          memberNumber: '',
          storeName: getStoreName(brand, 'aupay'),
          productCode,
          costPrice,
          subtotal,
          quantity: unit,
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
