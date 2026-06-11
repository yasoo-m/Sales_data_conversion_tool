export type MallType = 'amazon' | 'rakuten' | 'yahoo' | 'makeshop' | 'mercari' | 'aupay';

export type BrandType = 'cllink' | 'maqs';

export const MALL_LABELS: Record<MallType, string> = {
  amazon: 'Amazon',
  rakuten: '楽天市場',
  yahoo: 'ヤフーショッピング',
  makeshop: 'メイクショップ',
  mercari: 'メルカリショップス',
  aupay: 'au PAYマーケット',
};

export const BRAND_LABELS: Record<BrandType, string> = {
  cllink: 'シーエルリンク (C.L.LINK)',
  maqs: 'MAQs',
};

export const STORE_NAMES: Record<`${BrandType}_${MallType}`, string> = {
  cllink_amazon: 'C.L.LINK Amazon',
  cllink_rakuten: 'C.L.LINK 楽天',
  cllink_yahoo: 'C.L.LINK ショッピング',
  cllink_makeshop: 'C.L.LINK MakeShop',
  cllink_mercari: 'C.L.LINK メルカリショップス',
  cllink_aupay: 'C.L.LINK aupayマーケット',
  maqs_amazon: 'MAQs Amazon',
  maqs_rakuten: 'MAQs 楽天',
  maqs_yahoo: 'MAQs ショッピング',
  maqs_makeshop: 'MAQs MakeShop',
  maqs_mercari: 'MAQs メルカリショップス',
  maqs_aupay: 'MAQs aupayマーケット',
};

export interface UnifiedRow {
  shippingDate: string;      // A: 出荷日 (m月d日)
  shippingMonth: string;     // B: 出荷月 (yyyy年m月)
  postalCode: string;        // C: 郵便番号
  prefecture: string;        // D: 都道府県
  city: string;              // E: 市町村
  orderNumber: string;       // F: 受注番号
  memberNumber: string;      // G: 会員番号
  storeName: string;         // H: 店舗名称
  productCode: string;       // I: 商品コード
  costPrice: number | null;  // J: 原価
  costTotal: number | null;  // K: 原価計
  subtotal: number;          // L: 小計
  quantity: number;          // M: 受注数
  total: number;             // N: 合計
  shippingFee: number;       // O: 配送料
  totalSales: number;        // P: 総売上
  grossProfit: number | null;// Q: 粗利
  paymentMethod: string;     // R: 支払方法
}

export interface ConversionResult {
  rows: UnifiedRow[];
  warnings: ConversionWarning[];
  errors: ConversionError[];
}

export interface ConversionWarning {
  row: number;
  column: string;
  message: string;
  type: 'cost_not_found' | 'code_not_found' | 'postal_invalid' | 'quantity_zero' | 'payment_not_found';
}

export interface ConversionError {
  row: number;
  column: string;
  message: string;
  type: 'invalid_number' | 'parse_error';
}

export interface ProductCodeMapping {
  id?: number;
  oldCode: string;
  newCode: string;
  productName: string;
}

export interface PaymentMethodMapping {
  id?: number;
  oldName: string;
  newName: string;
}

export interface PostalCodeEntry {
  postalCode: string;
  prefecture: string;
  city: string;
}

export interface CostEntry {
  productCode: string;
  cost: number;
  brandType: 'parts' | 'maqs';
}
