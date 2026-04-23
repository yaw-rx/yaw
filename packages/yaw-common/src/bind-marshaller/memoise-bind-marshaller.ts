import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';

export const memoiseBindMarshaller = (inner: BindMarshaller): BindMarshaller => {
    const decodeCache = new Map<string, BindMarshallerResult | undefined>();

    return {
        encode(kind: BindKind, memberPath?: string[]): string {
            return inner.encode(kind, memberPath);
        },

        decode(attr: string): BindMarshallerResult | undefined {
            let result = decodeCache.get(attr);
            if (result !== undefined) return result;
            if (decodeCache.has(attr)) return undefined;
            result = inner.decode(attr);
            decodeCache.set(attr, result);
            return result;
        },
    };
};
