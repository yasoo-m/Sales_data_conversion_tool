import Encoding from 'encoding-japanese';
import Papa from 'papaparse';

export function detectAndDecode(buffer: Buffer): string {
  const uint8 = new Uint8Array(buffer);
  const detected = Encoding.detect(uint8);

  if (detected === 'UTF8') {
    const str = buffer.toString('utf-8');
    return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
  }

  const unicodeArray = Encoding.convert(uint8, {
    to: 'UNICODE',
    from: detected as string,
  });
  return Encoding.codeToString(unicodeArray);
}

export function parseCSV(text: string): string[][] {
  const result = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
  });
  return result.data as string[][];
}

export function parseTSV(text: string): string[][] {
  const result = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
    delimiter: '\t',
  });
  return result.data as string[][];
}

export function parseFile(buffer: Buffer, filename: string): string[][] {
  const ext = filename.toLowerCase().split('.').pop();
  const text = detectAndDecode(buffer);

  if (ext === 'tsv') {
    return parseTSV(text);
  }
  return parseCSV(text);
}
