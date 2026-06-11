import type { BrandType, ConversionResult, ConversionWarning, ConversionError } from '../types';
import { getStoreName, parseDate, parseNumber, taxExclude, resolveProductCode, resolveCost, resolvePaymentMethod, loadMasterCaches, clearMasterCaches, buildRow } from './helpers';

// Yahoo Shopping CSV columns (0-indexed):
// A(0): OrderId, B(1): ShipPrefecture, C(2): ShipCity
// D(3): OrderTime, E(4): ItemId, F(5): SubCode
// H(7): UnitPrice, I(8): QuantityDetail
// J(9): ShipCharge, K(10): PayCharge
// M(12): PayMethodName

interface ExpandedRow {
  orderId: string;
  prefecture: string;
  city: string;
  orderTime: string;
  itemCode: string;
  unitPrice: string;
  quantity: string;
  shipCharge: string;
  payCharge: string;
  payMethod: string;
}

function preprocessYahoo(rows: string[][]): ExpandedRow[] {
  const expanded: ExpandedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 13) continue;

    const orderId = row[0]?.trim() || '';
    const prefecture = row[1]?.trim() || '';
    const city = row[2]?.trim() || '';
    const orderTime = row[3]?.trim() || '';
    const itemIds = row[4]?.trim() || '';
    const subCodes = row[5]?.trim() || '';
    const unitPrices = row[7]?.trim() || '';
    const quantities = row[8]?.trim() || '';
    const shipCharge = row[9]?.trim() || '';
    const payCharge = row[10]?.trim() || '';
    const payMethod = row[12]?.trim() || '';

    // Split by & for multi-item orders
    const itemIdList = itemIds.split('&').map(s => s.trim()).filter(Boolean);
    const subCodeList = subCodes.split('&').map(s => s.trim()).filter(Boolean);
    const unitPriceList = unitPrices.split('&').map(s => s.trim()).filter(Boolean);
    const quantityList = quantities.split('&').map(s => s.trim()).filter(Boolean);

    // Remove L1=, L2=, ... L10= prefixes
    const cleanPrefix = (s: string) => s.replace(/^L\d{1,2}=/, '');

    const count = Math.max(subCodeList.length, itemIdList.length, 1);

    for (let j = 0; j < count; j++) {
      // Use SubCode if available, otherwise ItemId
      const rawCode = cleanPrefix(subCodeList[j] || '') || cleanPrefix(itemIdList[j] || '');
      const rawPrice = cleanPrefix(unitPriceList[j] || unitPriceList[0] || '0');
      const rawQty = cleanPrefix(quantityList[j] || quantityList[0] || '0');

      expanded.push({
        orderId,
        prefecture,
        city,
        orderTime,
        itemCode: rawCode,
        unitPrice: rawPrice,
        quantity: rawQty,
        shipCharge: j === 0 ? shipCharge : '0', // Only first item gets shipping
        payCharge: j === 0 ? payCharge : '0',
        payMethod,
      });
    }
  }

  return expanded;
}

export async function convertYahoo(rows: string[][], brand: BrandType): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const errors: ConversionError[] = [];
  const resultRows = [];

  const expanded = preprocessYahoo(rows);

  await loadMasterCaches();
  try {
    for (let i = 0; i < expanded.length; i++) {
      const item = expanded[i];

      try {
        const date = parseDate(item.orderTime);
        const productCode = resolveProductCode(item.itemCode);
        const costPrice = resolveCost(productCode, brand, i, warnings);
        const quantity = parseInt(item.quantity, 10) || 0;
        const unitPrice = taxExclude(parseNumber(item.unitPrice)); // Tax-exclusive
        const shipCharge = taxExclude(parseNumber(item.shipCharge));
        const payCharge = taxExclude(parseNumber(item.payCharge));
        const shippingFee = shipCharge + payCharge;
        const paymentMethod = resolvePaymentMethod(item.payMethod);

        if (quantity === 0) {
          warnings.push({ row: i + 1, column: 'M', message: '受注数が0です', type: 'quantity_zero' });
        }

        resultRows.push(buildRow({
          date,
          postalCode: '', // Yahoo doesn't provide postal code
          prefecture: item.prefecture,
          city: item.city,
          orderNumber: item.orderId,
          memberNumber: '',
          storeName: getStoreName(brand, 'yahoo'),
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
