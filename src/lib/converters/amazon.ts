import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseDate, parseNumber, removeHyphen, resolveProductCode, resolveCost, resolvePostalCode, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// Amazon CSV columns (0-indexed):
// A(0): amazon-order-id, C(2): purchase-date, L(11): asin
// O(14): quantity-purchased, Q(16): item-price, R(17): item-tax
// S(18): shipping-price, T(19): shipping-tax, AA(26): ship-postal-code

export async function convertAmazon(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  await loadMasterCaches();
  try {
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 20) continue;

      try {
        const orderId = row[0]?.trim() || '';
        const purchaseDate = row[2]?.trim() || '';
        const asin = row[11]?.trim() || '';
        const quantity = parseInt(row[14]?.trim() || '0', 10);
        const itemPrice = parseNumber(row[16]);
        const itemTax = parseNumber(row[17]);
        const shippingPrice = parseNumber(row[18]);
        const shippingTax = parseNumber(row[19]);
        const rawPostalCode = row[26]?.trim() || '';

        const date = parseDate(purchaseDate.substring(0, 10));
        const postalCode = removeHyphen(rawPostalCode);
        const { prefecture, city } = resolvePostalCode(postalCode, i, warnings);
        const productCode = resolveProductCode(asin);
        const costPrice = resolveCost(productCode, brand, i, warnings);

        const totalAmount = itemPrice - itemTax;
        const shippingFee = shippingPrice - shippingTax;
        const subtotal = quantity > 0 ? totalAmount / quantity : 0;

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
          storeName: getStoreName(brand, 'amazon'),
          productCode,
          costPrice,
          subtotal,
          quantity,
          shippingFee,
          paymentMethod: 'Amazonペイメント',
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
