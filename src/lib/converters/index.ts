import type { BrandType, MallType, ConversionResult } from '../types';
import { convertAmazon } from './amazon';
import { convertRakuten } from './rakuten';
import { convertYahoo } from './yahoo';
import { convertMakeshop } from './makeshop';
import { convertMercari } from './mercari';
import { distributeShippingFee, matchCancelledRows, zeroCancelledRows } from './helpers';

export type Converter = (
  rows: string[][],
  brand: BrandType,
  cancelRows?: string[][],
) => Promise<ConversionResult>;

type MallConverter = (rows: string[][], brand: BrandType) => Promise<ConversionResult>;

const converters: Record<MallType, MallConverter> = {
  amazon: convertAmazon,
  rakuten: convertRakuten,
  yahoo: convertYahoo,
  makeshop: convertMakeshop,
  mercari: convertMercari,
};

export function getConverter(mall: MallType): Converter | null {
  const converter = converters[mall];
  if (!converter) return null;

  return async (rows, brand, cancelRows) => {
    const result = await converter(rows, brand);

    // 注文キャンセルデータは売上CSVと同一フォーマットのため、同じコンバーターで変換して照合する
    if (!cancelRows || cancelRows.length <= 1) {
      return { ...result, rows: distributeShippingFee(result.rows) };
    }

    // キャンセルデータ側の警告・エラーは売上データの検証結果ではないため取り込まない
    const cancelResult = await converter(cancelRows, brand);
    const { cancelled, appliedRows, excludedRows } = matchCancelledRows(result.rows, cancelResult.rows);

    // 配送料の均等割りを先に行い、そのうえでキャンセル該当行を0にする
    const distributed = distributeShippingFee(result.rows, cancelled);

    return {
      ...result,
      rows: zeroCancelledRows(distributed, cancelled),
      cancelSummary: { cancelRows: cancelResult.rows.length, appliedRows, excludedRows },
    };
  };
}
