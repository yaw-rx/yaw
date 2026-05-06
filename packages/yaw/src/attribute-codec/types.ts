/**
 * Codec for marshalling a typed value to and from a DOM attribute string.
 * @template T - The runtime type the codec handles.
 * @property {(value: T) => string} encode - Converts a value to its attribute string.
 * @property {(raw: string) => T} decode - Parses an attribute string back to a value.
 */
export interface AttributeCodec<T = unknown> {
    encode: (value: T) => string;
    decode: (raw: string) => T;
}
