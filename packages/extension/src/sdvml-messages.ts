import { RequestType } from 'vscode-jsonrpc';

export const GetImageRequest = new RequestType<
    { elementId: string; position: { x: number; y: number; }; },
    { image: string; position: { x: number; y: number; }; },
    void // Error
>('get-image');
