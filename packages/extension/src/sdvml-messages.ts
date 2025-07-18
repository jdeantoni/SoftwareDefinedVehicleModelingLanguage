import { RequestType as VSCodeRequestType } from 'vscode-jsonrpc';

// Wrap to "erase" the extra generics for Sprotty:
type SprottyRequestType<P, R> = Omit<VSCodeRequestType<P, R, any>, '_'> & {
  // explicitly override the internal "_" type to match the 2-generic version
  _: [P, R] | undefined;
};

export const GetImageRequest = new VSCodeRequestType<
  { elementId: string; position: { x: number; y: number } },
  { image: string; position: { x: number; y: number } },
  void
>('getImage') as unknown as SprottyRequestType<
  { elementId: string; position: { x: number; y: number } },
  { image: string; position: { x: number; y: number } }
>;