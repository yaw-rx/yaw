import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';

const RE_ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g;
const RE_CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;

const RE = /(data-rx-bind-(class|style|attr|prop|ref|on|text))(-)?|(\.)|(?:(webkit|moz))(?=-|\.|$)|-(css|html|ns|svg|uri|url|xml)(?=-|\.|$)|-([a-z])|([a-z0-9_]+)/gy;

export class SingleRegexBindMarshaller implements BindMarshaller {
    #encodeSeg(seg: string): string {
        return seg
            .replace(RE_ACRONYM_BOUNDARY, '$1-$2')
            .replace(RE_CAMEL_BOUNDARY, '$1-$2')
            .toLowerCase();
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
        if (attr.charCodeAt(0) !== 100) return undefined;

        RE.lastIndex = 0;
        const first = RE.exec(attr);
        if (first === null || first[1] === undefined) return undefined;

        const kind = first[2] as BindKind;
        if (first[3] === undefined) return { kind, memberPath: [] };
        if (kind === 'style') return { kind, memberPath: [attr.substring(RE.lastIndex)] };

        const segments: string[] = [];
        let seg = '';
        let m: RegExpExecArray | null;

        while ((m = RE.exec(attr)) !== null) {
            if (m[4] !== undefined) {
                segments.push(seg);
                seg = '';
            } else if (m[5] !== undefined) {
                seg += m[5] === 'webkit' ? 'Webkit' : 'Moz';
            } else if (m[6] !== undefined) {
                seg += m[6].toUpperCase();
            } else if (m[7] !== undefined) {
                seg += m[7].toUpperCase();
            } else if (m[8] !== undefined) {
                seg += m[8];
            }
        }

        segments.push(seg);
        return { kind, memberPath: segments };
    }
}
