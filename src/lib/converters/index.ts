import type { BrandType, MallType, ConversionResult } from '../types';
import { convertAmazon } from './amazon';
import { convertRakuten } from './rakuten';
import { convertYahoo } from './yahoo';
import { convertMakeshop } from './makeshop';
import { convertMercari } from './mercari';
import { convertAupay } from './aupay';

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
  return converters[mall];
}
