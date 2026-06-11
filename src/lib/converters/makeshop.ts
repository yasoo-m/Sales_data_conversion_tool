import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseDate, parseNumber, taxExclude, resolveProductCode, resolveCost, resolvePaymentMethod, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// MakeShop CSV columns (0-indexed):
// A(0): 注文日時, E(4): 郵便番号, G(6): 都道府県, H(7): 市町村
// I(8): 支払方法, J(9): 商品金額（税抜単価）, K(10): 受注数
// L(11): 送料（税込）, M(12): 代金引換手数料（税込）
// O(14): 商品コード（前半）, P(15): 商品コード（後半）
// R(17): 会員番号, S(18): 受注番号

export async function convertMakeshop(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  await loadMasterCaches();
  try {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 19) continue;

      try {
        const orderDate = row[0]?.trim() || '';
        const rawPostalCode = row[4]?.trim() || '';
        const prefecture = row[6]?.trim() || '';
        const city = row[7]?.trim() || '';
        const payMethod = row[8]?.trim() || '';
        const productAmount = parseNumber(row[9]);
        const quantity = parseInt(row[10]?.trim() || '0', 10);
        const shippingTaxIncl = parseNumber(row[11]);
        const codFeeTaxIncl = parseNumber(row[12]);
        const codePrefix = row[14]?.trim() || '';
        const codeSuffix = row[15]?.trim() || '';
        const memberNumber = row[17]?.trim() || '';
        const orderNumber = row[18]?.trim() || '';

        const date = parseDate(orderDate);
        const postalCode = rawPostalCode.replace(/-/g, '').replace(/−/g, '');

        // Combine product code parts
        const rawCode = codePrefix + codeSuffix;
        const productCode = resolveProductCode(rawCode);
        const costPrice = resolveCost(productCode, brand, i, warnings);

        // Shipping: (送料 / 1.1) + (代引手数料 / 1.1)
        const shippingFee = taxExclude(shippingTaxIncl) + taxExclude(codFeeTaxIncl);

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
          memberNumber,
          storeName: getStoreName(brand, 'makeshop'),
          productCode,
          costPrice,
          subtotal: productAmount,
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
