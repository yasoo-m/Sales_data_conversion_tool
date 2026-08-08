import type { BrandType, MallType, ConversionResult } from '../types';
import { convertAmazon } from './amazon';
import { convertRakuten } from './rakuten';
import { convertYahoo } from './yahoo';
import { convertMakeshop } from './makeshop';
import { convertMercari } from './mercari';
import { convertAupay } from './aupay';
import { distributeShippingFee } from './helpers';

export type Converter = (rows: string[][], brand: BrandType) => Promise<ConversionResult>;

const converters: Record<MallType, Converter> = {
  amazon: convertAmazon,
  rakuten: convertRakuten,
  yahoo: convertYahoo,
  makeshop: convertMakeshop,
  mercari: convertMercari,
  aupay: convertAupay,
};

export function getConverter(mall: MallType): Converter | null {
  const converter = converters[mall];
  if (!converter) return null;

  // 全モール共通の後処理: 同一受注番号の行に配送料を均等割りする
  return async (rows, brand) => {
    const result = await converter(rows, brand);
    return { ...result, rows: distributeShippingFee(result.rows) };
  };
}
