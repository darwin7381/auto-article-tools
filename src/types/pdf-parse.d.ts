declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
    };
  }
  
  function parse(dataBuffer: Buffer): Promise<PDFData>;
  export default parse;
}
