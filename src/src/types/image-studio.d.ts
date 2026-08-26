declare module 'heic2any' {
  interface HeicConversionOptions {
    blob: Blob;
    toType: string;
    quality?: number;
  }
  const convert: (options: HeicConversionOptions) => Promise<Blob | Blob[]>;
  export default convert;
}

declare module 'piexifjs' {
  const piexif: {
    load(data: string): unknown;
    dump(data: unknown): string;
    insert(exif: string, jpeg: string): string;
    ImageIFD: {
      Artist: number;
      Copyright: number;
      ImageDescription: number;
    };
  };
  export default piexif;
}
