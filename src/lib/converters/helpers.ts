import type { BrandType, ConversionWarning, UnifiedRow } from '../types';
import { STORE_NAMES, type MallType } from '../types';
import { ensureInit } from '../db';

// ---- Master data caches (loaded once before conversion) ----
let productCodeCache: Map<string, string> | null = null;
let costCache: Map<string, number> | null = null;  // key: "productCode:brandType"
let paymentMethodCache: Map<string, string> | null = null;
let postalCodeCache: Map<string, { prefecture: string; city: string }> | null = null;

export async function loadMasterCaches(): Promise<void> {
  const db = await ensureInit();

  const [productCodes, costs, paymentMethods, postalCodes] = await Promise.all([
    db.execute('SELECT old_code, new_code FROM product_codes'),
    db.execute('SELECT product_code, cost, brand_type FROM costs'),
    db.execute('SELECT old_name, new_name FROM payment_methods'),
    db.execute('SELECT postal_code, prefecture, city FROM postal_codes'),
  ]);

  productCodeCache = new Map();
  for (const row of productCodes.rows) {
    const r = row as unknown as { old_code: string; new_code: string };
    productCodeCache.set(r.old_code, r.new_code);
  }

  costCache = new Map();
  for (const row of costs.rows) {
    const r = row as unknown as { product_code: string; cost: number; brand_type: string };
    costCache.set(`${r.product_code}:${r.brand_type}`, r.cost);
  }

  paymentMethodCache = new Map();
  for (const row of paymentMethods.rows) {
    const r = row as unknown as { old_name: string; new_name: string };
    paymentMethodCache.set(r.old_name, r.new_name);
  }

  postalCodeCache = new Map();
  for (const row of postalCodes.rows) {
    const r = row as unknown as { postal_code: string; prefecture: string; city: string };
    postalCodeCache.set(r.postal_code, { prefecture: r.prefecture, city: r.city });
  }
}

export function clearMasterCaches(): void {
  productCodeCache = null;
  costCache = null;
  paymentMethodCache = null;
  postalCodeCache = null;
}

export function getStoreName(brand: BrandType, mall: MallType): string {
  return STORE_NAMES[`${brand}_${mall}`] || '';
}

export function formatShippingDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatShippingMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function parseNumber(val: string): number {
  if (!val || val.trim() === '') return 0;
  const num = parseFloat(val.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

export function removeHyphen(str: string): string {
  return str.replace(/-/g, '').replace(/−/g, '').trim();
}

export function taxExclude(taxIncluded: number): number {
  return Math.round(taxIncluded / 1.1);
}

export function cleanProductCode(code: string): string {
  return code.replace(/["=]/g, '');
}

export function resolveProductCode(code: string): string {
  const cleaned = cleanProductCode(code);
  if (productCodeCache) {
    return productCodeCache.get(cleaned) ?? cleaned;
  }
  return cleaned;
}

export function resolveCost(productCode: string, brand: BrandType, rowIndex: number, warnings: ConversionWarning[]): number | null {
  const brandType = brand === 'cllink' ? 'parts' : 'maqs';

  let cost: number | undefined;
  if (costCache) {
    cost = costCache.get(`${productCode}:${brandType}`);
    // For MAQs, fallback to parts
    if (cost === undefined && brandType === 'maqs') {
      cost = costCache.get(`${productCode}:parts`);
    }
  }

  if (cost === undefined) {
    if (productCode) {
      warnings.push({
        row: rowIndex + 1,
        column: 'J',
        message: `商品コード「${productCode}」の原価が見つかりません`,
        type: 'cost_not_found',
      });
    }
    return null;
  }
  return Math.round(cost);
}

export function resolvePaymentMethod(method: string): string {
  if (paymentMethodCache) {
    return paymentMethodCache.get(method) ?? method;
  }
  return method;
}

export function resolvePostalCode(postalCode: string, rowIndex: number, warnings: ConversionWarning[]): { prefecture: string; city: string } {
  if (!postalCode || postalCode.length !== 7) {
    if (postalCode && postalCode.length > 0) {
      warnings.push({
        row: rowIndex + 1,
        column: 'C',
        message: `郵便番号「${postalCode}」が不正です（7桁でない）`,
        type: 'postal_invalid',
      });
    }
    return { prefecture: '', city: '' };
  }
  if (postalCodeCache) {
    const entry = postalCodeCache.get(postalCode);
    return entry ? { prefecture: entry.prefecture, city: entry.city } : { prefecture: '', city: '' };
  }
  return { prefecture: '', city: '' };
}

export function buildRow(params: {
  date: Date | null;
  postalCode: string;
  prefecture: string;
  city: string;
  orderNumber: string;
  memberNumber: string;
  storeName: string;
  productCode: string;
  costPrice: number | null;
  subtotal: number;
  quantity: number;
  shippingFee: number;
  paymentMethod: string;
}): UnifiedRow {
  const { date, postalCode, prefecture, city, orderNumber, memberNumber, storeName, productCode, costPrice, subtotal, quantity, shippingFee, paymentMethod } = params;

  const total = subtotal * quantity;
  const costTotal = costPrice !== null ? costPrice * quantity : null;
  const totalSales = total + shippingFee;
  const grossProfit = costTotal !== null ? totalSales - costTotal : null;

  return {
    shippingDate: date ? formatShippingDate(date) : '',
    shippingMonth: date ? formatShippingMonth(date) : '',
    postalCode,
    prefecture,
    city,
    orderNumber,
    memberNumber,
    storeName,
    productCode,
    costPrice,
    costTotal,
    subtotal: Math.round(subtotal),
    quantity,
    total: Math.round(total),
    shippingFee: Math.round(shippingFee),
    totalSales: Math.round(totalSales),
    grossProfit: grossProfit !== null ? Math.round(grossProfit) : null,
    paymentMethod,
  };
}
