import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';
export declare class SingleRegexBindMarshaller implements BindMarshaller {
    #private;
    encode(kind: BindKind, memberPath?: string[]): string;
    decode(attr: string): BindMarshallerResult | undefined;
}
