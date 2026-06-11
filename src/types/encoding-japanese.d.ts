declare module 'encoding-japanese' {
  interface ConvertOptions {
    to: string;
    from: string;
  }
  const Encoding: {
    detect(data: Uint8Array | number[]): string | false;
    convert(data: Uint8Array | number[], options: ConvertOptions): number[];
    codeToString(data: number[]): string;
  };
  export default Encoding;
}
