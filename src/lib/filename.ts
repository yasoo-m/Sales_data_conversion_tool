import { MALL_LABELS, type BrandType, type MallType, type UnifiedRow } from './types';

// ファイル名に使うブランド表記（画面表示用の BRAND_LABELS とは別）
const BRAND_FILE_LABELS: Record<BrandType, string> = {
  cllink: 'CLLINK',
  maqs: 'MAQs',
};

/** Windows/macOS でファイル名に使えない文字を除去する */
function sanitize(segment: string): string {
  return segment.replace(/[\\/:*?"<>|]/g, '').trim();
}

/**
 * 出荷月(B列)の最頻値を返す。
 * 複数月にまたがる場合は件数が最も多い月を採用し、同数の場合は先に出現した月を優先する。
 * 有効な出荷月が1件もない場合は空文字を返す。
 */
function resolvePeriod(rows: UnifiedRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const month = row.shippingMonth?.trim();
    if (!month) continue;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  let period = '';
  let maxCount = 0;
  counts.forEach((count, month) => {
    if (count > maxCount) {
      period = month;
      maxCount = count;
    }
  });

  return period;
}

/** 作成日を yyyymmdd 形式で返す（ローカルタイム基準） */
function formatCreatedAt(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Excelダウンロード時のファイル名を生成する。
 *
 * 命名規則: 売上データ_{出荷月}分_{ブランド名}_{店舗名}_{作成日}.xlsx
 *   例: 売上データ_2026年2月分_MAQs_Amazon_20260808.xlsx
 *
 * - 出荷月: B列(出荷月)の最頻値。複数月にまたがる場合は件数が最も多い月
 * - ブランド名: CLLINK / MAQs
 * - 店舗名: モール名（Amazon / 楽天市場 / ヤフーショッピング / メイクショップ /
 *           メルカリショップス / au PAYマーケット）
 * - 作成日: ダウンロード実行日を yyyymmdd 形式で（ローカルタイム基準）
 *
 * 値が取得できない項目はセグメントごと省略し、区切り文字が連続しないようにする。
 */
export function buildExcelFileName(params: {
  rows: UnifiedRow[];
  brand: BrandType;
  mall: MallType;
  createdAt?: Date;
}): string {
  const { rows, brand, mall, createdAt = new Date() } = params;

  const period = resolvePeriod(rows);
  const segments = [
    '売上データ',
    period ? `${period}分` : '',
    BRAND_FILE_LABELS[brand] ?? '',
    MALL_LABELS[mall] ?? '',
    formatCreatedAt(createdAt),
  ]
    .map(sanitize)
    .filter(Boolean);

  return `${segments.join('_')}.xlsx`;
}
