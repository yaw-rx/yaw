import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';

const RE_ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g;
const RE_CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;

const HYPHEN = 45;
const DOT = 46;

const KIND_MAP: Record<string, BindKind> = {
    'class': 'class', 'style': 'style', 'attr': 'attr',
    'prop': 'prop', 'ref': 'ref', 'on': 'on', 'text': 'text',
};

const ACRONYM_2: Record<string, string> = { 'ns': 'NS' };
const ACRONYM_3: Record<string, string> = { 'css': 'CSS', 'svg': 'SVG', 'uri': 'URI', 'url': 'URL', 'xml': 'XML', 'moz': 'Moz' };
const ACRONYM_4: Record<string, string> = { 'html': 'HTML' };
const ACRONYM_6: Record<string, string> = { 'webkit': 'Webkit' };

export class CharscanBindMarshaller implements BindMarshaller {
    #encodeSeg(seg: string): string {
        return seg
            .replace(RE_ACRONYM_BOUNDARY, '$1-$2')
            .replace(RE_CAMEL_BOUNDARY, '$1-$2')
            .toLowerCase();
    }

    #decodeSeg(seg: string): string {
        let result = '';
        let i = 0;
        const len = seg.length;

        if (len >= 6 && seg.charCodeAt(0) === 119) {
            const lead = seg.substring(0, 6);
            const mapped = ACRONYM_6[lead];
            if (mapped !== undefined && (len === 6 || seg.charCodeAt(6) === HYPHEN)) {
                result = mapped;
                i = len === 6 ? 6 : 7;
                if (i < len) {
                    result += seg.charAt(i).toUpperCase();
                    i++;
                }
            }
        } else if (len >= 3 && seg.charCodeAt(0) === 109) {
            const lead = seg.substring(0, 3);
            const mapped = ACRONYM_3[lead];
            if (mapped === 'Moz' && (len === 3 || seg.charCodeAt(3) === HYPHEN)) {
                result = mapped;
                i = len === 3 ? 3 : 4;
                if (i < len) {
                    result += seg.charAt(i).toUpperCase();
                    i++;
                }
            }
        }

        while (i < len) {
            const ch = seg.charCodeAt(i);
            if (ch === HYPHEN) {
                i++;
                if (i >= len) break;

                let matched = false;
                for (const aLen of [6, 4, 3, 2]) {
                    if (i + aLen > len) continue;
                    const next = i + aLen < len ? seg.charCodeAt(i + aLen) : -1;
                    if (next !== HYPHEN && next !== DOT && next !== -1) continue;
                    const word = seg.substring(i, i + aLen);
                    const table = aLen === 2 ? ACRONYM_2 : aLen === 3 ? ACRONYM_3 : aLen === 4 ? ACRONYM_4 : ACRONYM_6;
                    const mapped = table[word];
                    if (mapped !== undefined && mapped !== 'Moz') {
                        result += mapped;
                        i += aLen;
                        matched = true;
                        break;
                    }
                }
                if (!matched) {
                    result += seg.charAt(i).toUpperCase();
                    i++;
                }
            } else {
                result += seg.charAt(i);
                i++;
            }
        }
        return result;
    }

    encode(kind: BindKind, memberPath?: string[]): string {
        if (memberPath === undefined || memberPath.length === 0) return `data-rx-bind-${kind}`;
        let encoded = '';
        for (let i = 0; i < memberPath.length; i++) {
            if (i > 0) encoded += '.';
            encoded += this.#encodeSeg(memberPath[i]!);
        }
        return `data-rx-bind-${kind}-${encoded}`;
    }

    decode(attr: string): BindMarshallerResult | undefined {
        if (attr.length < 15 || attr.charCodeAt(0) !== 100) return undefined;
        if (attr.charCodeAt(5) !== 114 || attr.charCodeAt(8) !== 98) return undefined;

        const afterPrefix = 13;
        const kindEnd = attr.indexOf('-', afterPrefix);
        const kindStr = kindEnd === -1 ? attr.substring(afterPrefix) : attr.substring(afterPrefix, kindEnd);
        const kind = KIND_MAP[kindStr];
        if (kind === undefined) return undefined;

        if (kindEnd === -1) return { kind, memberPath: [] };

        const raw = attr.substring(kindEnd + 1);
        if (kind === 'style') return { kind, memberPath: [raw] };

        const dotIdx = raw.indexOf('.');
        if (dotIdx === -1) {
            return { kind, memberPath: [this.#decodeSeg(raw)] };
        }

        const segs: string[] = [];
        let start = 0;
        let pos = 0;
        const rlen = raw.length;
        while (pos <= rlen) {
            if (pos === rlen || raw.charCodeAt(pos) === DOT) {
                segs.push(this.#decodeSeg(raw.substring(start, pos)));
                start = pos + 1;
            }
            pos++;
        }
        return { kind, memberPath: segs };
    }
}
