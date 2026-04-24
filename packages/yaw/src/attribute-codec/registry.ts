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
]);

export const registerAttributeCodecs = (attributeCodecs: Record<string, AttributeCodec>): void => {
    for (const [name, codec] of Object.entries(attributeCodecs)) {
        registry.set(name, codec);
    }
};

export const getAttributeCodec = (typeName: string): AttributeCodec =>
    registry.get(typeName) ?? JSON_FALLBACK;
