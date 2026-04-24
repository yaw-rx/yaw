export interface AttributeCodec<T = unknown> {
    encode: (value: T) => string;
    decode: (raw: string) => T;
}
