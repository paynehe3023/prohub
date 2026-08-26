declare module 'heic2any' {
  interface HeicConversionOptions {
    blob: Blob;
    toType: string;
    quality?: number;
  }
  const convert: (options: HeicConversionOptions) => Promise<Blob | Blob[]>;
  export default convert;
}
