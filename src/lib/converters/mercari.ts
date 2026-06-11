import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseNumber, taxExclude, removeHyphen, resolveProductCode, resolveCost, resolvePostalCode, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// メルカリショップス CSV columns (0-indexed):
// A(0): order_id, B(1): purchase_date ("2026年2月1日 04:35"形式)
// E(4): original_product_id, G(6): quantity
// I(8): product_price (税込), K(10): shipping_price (税込)
// T(19): shipping_postal_code, U(20): shipping_state, V(21): shipping_city

function parseMercariDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // "2026年2月1日 04:35" 形式を解析
  const yearMatch = dateStr.match(/^(\d+)年(\d+)月(\d+)日/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1]), parseInt(yearMatch[2]) - 1, parseInt(yearMatch[3]));
  }
  // フォールバック: 標準的な日付形式
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export async function convertMercari(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  await loadMasterCaches();
  try {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 22) continue;

      try {
        const orderId = row[0]?.trim() || '';
        const purchaseDate = row[1]?.trim() || '';
        const originalProductId = row[4]?.trim() || '';
        const quantity = parseInt(row[6]?.trim() || '0', 10);
        const productPrice = parseNumber(row[8]); // 税込
        const shippingPrice = parseNumber(row[10]); // 税込
        const rawPostalCode = row[19]?.trim() || '';
        const shippingState = row[20]?.trim() || '';
        const shippingCity = row[21]?.trim() || '';

        const date = parseMercariDate(purchaseDate);
        const postalCode = removeHyphen(rawPostalCode);

        // 郵便番号から都道府県・市町村を解決（CSVに都道府県・市町村がある場合はそちらを優先）
        let prefecture = shippingState;
        let city = shippingCity;
        if (!prefecture && postalCode) {
          const postal = resolvePostalCode(postalCode, i, warnings);
          prefecture = postal.prefecture;
          city = postal.city;
        }

        const productCode = resolveProductCode(originalProductId);
        const costPrice = resolveCost(productCode, brand, i, warnings);

        // 小計: 税込単価 ÷ 1.1
        const subtotal = taxExclude(productPrice);
        // 配送料: 税込送料 ÷ 1.1
        const shippingFee = taxExclude(shippingPrice);

        if (quantity === 0) {
          warnings.push({ row: i + 1, column: 'M', message: '受注数が0です', type: 'quantity_zero' });
        }

        resultRows.push(buildRow({
          date,
          postalCode,
          prefecture,
          city,
          orderNumber: orderId,
          memberNumber: '',
          storeName: getStoreName(brand, 'mercari'),
          productCode,
          costPrice,
          subtotal,
          quantity,
          shippingFee,
          paymentMethod: 'メルカリペイメント',
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
