import type { AttributeCodec } from './types.js';

const num = (s: string): number => {
    const n = Number(s);
    if (Number.isNaN(n) && s !== 'NaN') throw new Error('not a number');
    return n;
};

const JSON_FALLBACK: AttributeCodec = {
    encode: (v) => JSON.stringify(v),
    decode: (s) => JSON.parse(s) as unknown,
};

const codec = <T>(encode: (value: T) => string, decode: (raw: string) => T): AttributeCodec =>
    ({ encode: encode as (value: unknown) => string, decode });

const typedArrayCodec = <T extends ArrayLike<number | bigint> & { buffer: ArrayBufferLike }>(
    Ctor: { new (arr: number[] | bigint[]): T; name: string },
): AttributeCodec =>
    codec<T>(
        (v) => JSON.stringify(Array.from(v as unknown as ArrayLike<number | bigint>)),
        (s) => new Ctor(JSON.parse(s) as number[] & bigint[]),
    );

const registry = new Map<string, AttributeCodec>([
    ['string',  codec<string>((v) => v, (s) => s)],
    ['number',  codec<number>((v) => String(v), num)],
    ['boolean', codec<boolean>((v) => String(v), (s) => s !== 'false')],
    ['bigint',  codec<bigint>((v) => String(v), (s) => BigInt(s))],
    ['Date',    codec<Date>((v) => v.toISOString(), (s) => new Date(s))],
    ['RegExp',  codec<RegExp>((v) => v.source, (s) => new RegExp(s))],
    ['URL',     codec<URL>((v) => v.href, (s) => new URL(s))],
    ['Map',     codec<Map<unknown, unknown>>((v) => JSON.stringify([...v]), (s) => new Map(JSON.parse(s) as [unknown, unknown][]))],
    ['Set',     codec<Set<unknown>>((v) => JSON.stringify([...v]), (s) => new Set(JSON.parse(s) as unknown[]))],
    ['Array',   codec<unknown[]>((v) => JSON.stringify(v), (s) => JSON.parse(s) as unknown[])],
    ['Object',  codec<Record<string, unknown>>((v) => JSON.stringify(v), (s) => JSON.parse(s) as Record<string, unknown>)],
    ['Uint8Array',      typedArrayCodec(Uint8Array)],
    ['Int8Array',       typedArrayCodec(Int8Array)],
    ['Uint8ClampedArray', typedArrayCodec(Uint8ClampedArray)],
    ['Uint16Array',     typedArrayCodec(Uint16Array)],
    ['Int16Array',      typedArrayCodec(Int16Array)],
    ['Uint32Array',     typedArrayCodec(Uint32Array)],
    ['Int32Array',      typedArrayCodec(Int32Array)],
    ['Float32Array',    typedArrayCodec(Float32Array)],
    ['Float64Array',    typedArrayCodec(Float64Array)],
    ['BigInt64Array',   typedArrayCodec(BigInt64Array)],
    ['BigUint64Array',  typedArrayCodec(BigUint64Array)],
]);

/**
 * Registers custom attribute codecs, overriding any built-in codecs
 * with the same type name.
 * @param {Record<string, AttributeCodec>} attributeCodecs - Map of type name to codec.
 * @returns {void}
 */
export const registerAttributeCodecs = (attributeCodecs: Record<string, AttributeCodec>): void => {
    for (const [name, codec] of Object.entries(attributeCodecs)) {
        registry.set(name, codec);
    }
};

export const getAttributeCodec = (typeName: string): AttributeCodec =>
    registry.get(typeName) ?? JSON_FALLBACK;
