import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import type { BindMarshaller } from './bind-marshaller.js';
import { ReplaceAndLookupBindMarshaller } from './replace-and-lookup.js';
import { OnePassRegexBindMarshaller } from './one-pass-regex.js';
import { CharscanBindMarshaller } from './charscan.js';
import { SingleRegexBindMarshaller } from './single-regex.js';
import { memoiseBindMarshaller } from './memoise-bind-marshaller.js';

const replaceAndLookup = new ReplaceAndLookupBindMarshaller();
const onePassRegex = new OnePassRegexBindMarshaller();
const charscan = new CharscanBindMarshaller();
const singleRegex = new SingleRegexBindMarshaller();

interface BcdEntry {
    __compat?: { mdn_url?: string; status?: { deprecated?: boolean } };
    [key: string]: unknown;
}

function isProperty(name: string, entry: BcdEntry): boolean {
    if (name.startsWith('__')) return false;
    if (name.endsWith('_event')) return false;
    if (name.endsWith('_permission')) return false;
    if (name === '@@iterator') return false;
    const url = entry.__compat?.mdn_url ?? '';
    if (url.includes('#instance_methods') || url.includes('#static_methods')) return false;
    if (name.startsWith('get') && name.length > 3 && name[3] === name[3]!.toUpperCase()) return false;
    if (name.startsWith('set') && name.length > 3 && name[3] === name[3]!.toUpperCase()) return false;
    if (name.startsWith('has') && name.length > 3 && name[3] === name[3]!.toUpperCase()) return false;
    if (name.startsWith('is') && name.length > 2 && name[2] === name[2]!.toUpperCase()) return false;
    return true;
}

function collectMembers(apiName: string, prefix: string[]): string[][] {
    const api = (bcd.api as Record<string, Record<string, BcdEntry>>)[apiName];
    if (!api) return [];
    const results: string[][] = [];
    for (const [name, entry] of Object.entries(api)) {
        if (!isProperty(name, entry as BcdEntry)) continue;
        results.push([...prefix, name]);
    }
    return results;
}

function collectCssProperties(): string[][] {
    const results: string[][] = [];
    for (const prop of Object.keys(bcd.css.properties)) {
        const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        results.push(['style', camel]);
        if (prop.startsWith('-webkit-')) {
            const stripped = prop.slice(8);
            const wk = 'Webkit' + stripped.charAt(0).toUpperCase() +
                stripped.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
            results.push(['style', wk]);
        }
        if (prop.startsWith('-moz-')) {
            const stripped = prop.slice(5);
            const moz = 'Moz' + stripped.charAt(0).toUpperCase() +
                stripped.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
            results.push(['style', moz]);
        }
    }
    return results;
}

function generateAllPaths(): string[][] {
    const seen = new Set<string>();
    const results: string[][] = [];

    const sources = [
        ...collectMembers('HTMLElement', []),
        ...collectMembers('Element', []),
        ...collectMembers('Node', []),
        ...collectMembers('CSSStyleDeclaration', ['style']),
        ...collectMembers('DOMTokenList', ['classList']),
        ...collectCssProperties(),
    ];

    for (const path of sources) {
        const key = path.join('.');
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(path);
    }

    return results.sort((a, b) => a.join('.').localeCompare(b.join('.')));
}

const allPaths = generateAllPaths();

function roundtripSuite(name: string, marshaller: BindMarshaller): void {
    describe(`${name} roundtrip`, () => {
        it(`covers ${allPaths.length} member paths`, () => {
            assert.ok(allPaths.length > 200, `expected >200 paths, got ${allPaths.length}`);
        });

        for (const memberPath of allPaths) {
            const label = memberPath.join('.');
            it(label, () => {
                const encoded = marshaller.encode('prop', memberPath);
                const result = marshaller.decode(encoded);
                assert.ok(result, `decode returned undefined for ${encoded}`);
                assert.deepStrictEqual(result.memberPath, memberPath,
                    `roundtrip failed: ${label} -> ${encoded} -> ${result.memberPath.join('.')}`);
            });
        }
    });
}

function paritySuite(name: string, marshaller: BindMarshaller): void {
    describe(`${name} parity`, () => {
        for (const memberPath of allPaths) {
            const label = memberPath.join('.');
            it(label, () => {
                const a = replaceAndLookup.encode('prop', memberPath);
                const b = marshaller.encode('prop', memberPath);
                assert.strictEqual(a, b, `encode mismatch: ${a} vs ${b}`);
            });
        }
    });
}

roundtripSuite('ReplaceAndLookupBindMarshaller', replaceAndLookup);
roundtripSuite('OnePassRegexBindMarshaller', onePassRegex);
roundtripSuite('CharscanBindMarshaller', charscan);
roundtripSuite('SingleRegexBindMarshaller', singleRegex);
roundtripSuite('memoised(ReplaceAndLookup)', memoiseBindMarshaller(new ReplaceAndLookupBindMarshaller()));
roundtripSuite('memoised(OnePassRegex)', memoiseBindMarshaller(new OnePassRegexBindMarshaller()));
roundtripSuite('memoised(Charscan)', memoiseBindMarshaller(new CharscanBindMarshaller()));
roundtripSuite('memoised(SingleRegex)', memoiseBindMarshaller(new SingleRegexBindMarshaller()));

paritySuite('OnePassRegexBindMarshaller', onePassRegex);
paritySuite('CharscanBindMarshaller', charscan);
paritySuite('SingleRegexBindMarshaller', singleRegex);

interface Algo {
    name: string;
    encode(kind: 'prop', memberPath: string[]): string;
    decode(attr: string): unknown;
}

const memoReplace = memoiseBindMarshaller(new ReplaceAndLookupBindMarshaller());
const memoOnePass = memoiseBindMarshaller(new OnePassRegexBindMarshaller());
const memoCharscan = memoiseBindMarshaller(new CharscanBindMarshaller());
const memoSingleRegex = memoiseBindMarshaller(new SingleRegexBindMarshaller());

const algos: Algo[] = [
    { name: 'replace+lookup', encode: (k, p) => replaceAndLookup.encode(k, p), decode: a => replaceAndLookup.decode(a) },
    { name: 'one-pass-regex', encode: (k, p) => onePassRegex.encode(k, p), decode: a => onePassRegex.decode(a) },
    { name: 'charscan', encode: (k, p) => charscan.encode(k, p), decode: a => charscan.decode(a) },
    { name: 'single-regex', encode: (k, p) => singleRegex.encode(k, p), decode: a => singleRegex.decode(a) },
    { name: 'memo(replace)', encode: (k, p) => memoReplace.encode(k, p), decode: a => memoReplace.decode(a) },
    { name: 'memo(one-pass)', encode: (k, p) => memoOnePass.encode(k, p), decode: a => memoOnePass.decode(a) },
    { name: 'memo(charscan)', encode: (k, p) => memoCharscan.encode(k, p), decode: a => memoCharscan.decode(a) },
    { name: 'memo(single-regex)', encode: (k, p) => memoSingleRegex.encode(k, p), decode: a => memoSingleRegex.decode(a) },
];

const preEncoded = allPaths.map(p => replaceAndLookup.encode('prop', p));
const ITERATIONS = 10_000;
const WARMUP = 500;
const TOTAL_OPS = allPaths.length * ITERATIONS;

function benchEncode(algo: Algo): number {
    for (let i = 0; i < WARMUP; i++) for (const p of allPaths) algo.encode('prop', p);
    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) for (const p of allPaths) algo.encode('prop', p);
    return Number(process.hrtime.bigint() - start) / TOTAL_OPS;
}

function benchDecode(algo: Algo): number {
    for (let i = 0; i < WARMUP; i++) for (const e of preEncoded) algo.decode(e);
    const start = process.hrtime.bigint();
    for (let i = 0; i < ITERATIONS; i++) for (const e of preEncoded) algo.decode(e);
    return Number(process.hrtime.bigint() - start) / TOTAL_OPS;
}

describe(`Benchmark — ${allPaths.length} paths × ${ITERATIONS} iterations`, () => {
    it('results', () => {
        const rows: { name: string; encNs: number; decNs: number }[] = [];
        for (const algo of algos) {
            rows.push({ name: algo.name, encNs: benchEncode(algo), decNs: benchDecode(algo) });
        }

        const pad = (s: string, n: number) => s.padStart(n);
        const hdr = [
            'algo'.padEnd(20),
            pad('enc ns/op', 10),
            pad('dec ns/op', 10),
            pad('1k enc', 10),
            pad('1k dec', 10),
        ].join(' | ');
        const sep = hdr.replace(/[^|]/g, '-');

        console.log();
        console.log(hdr);
        console.log(sep);
        for (const r of rows) {
            console.log([
                r.name.padEnd(20),
                pad(r.encNs.toFixed(0), 10),
                pad(r.decNs.toFixed(0), 10),
                pad((r.encNs * 1000 / 1e6).toFixed(3) + ' ms', 10),
                pad((r.decNs * 1000 / 1e6).toFixed(3) + ' ms', 10),
            ].join(' | '));
        }
        console.log();
    });
});
