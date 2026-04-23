import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';

const PREFIX = 'data-rx-bind-';

const RE_ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g;
const RE_CAMEL_BOUNDARY = /([a-z0-9])([A-Z])/g;
const RE_DECODE = /(?:^(webkit|moz)|-(?:(css|html|ns|svg|uri|url|xml)|([a-z])))/g;
const RE_ATTR = /^data-rx-bind-(class|style|attr|prop|ref|on|text)(?:-(.+))?$/;

export class OnePassRegexBindMarshaller implements BindMarshaller {
    #encodeSeg(seg: string): string {
        return seg
            .replace(RE_ACRONYM_BOUNDARY, '$1-$2')
            .replace(RE_CAMEL_BOUNDARY, '$1-$2')
            .toLowerCase();
    }

    #decodeSeg(seg: string): string {
        return seg.replace(RE_DECODE, (
            _match: string,
            leading: string | undefined,
            acronym: string | undefined,
            letter: string | undefined,
        ) => {
            if (leading !== undefined) return leading === 'webkit' ? 'Webkit' : 'Moz';
            if (acronym !== undefined) return acronym.toUpperCase();
            return letter!.toUpperCase();
        });
    }

    encode(kind: BindKind, memberPath?: string[]): string {
        if (memberPath === undefined || memberPath.length === 0) return `${PREFIX}${kind}`;
        let encoded = '';
        for (let i = 0; i < memberPath.length; i++) {
            if (i > 0) encoded += '.';
            encoded += this.#encodeSeg(memberPath[i]!);
        }
        return `${PREFIX}${kind}-${encoded}`;
    }

    decode(attr: string): BindMarshallerResult | undefined {
        if (attr.charCodeAt(0) !== 100) return undefined;
        const m = RE_ATTR.exec(attr);
        if (m === null) return undefined;
        const kind = m[1] as BindKind;
        const raw = m[2];
        if (raw === undefined) return { kind, memberPath: [] };
        if (kind === 'style') return { kind, memberPath: [raw] };
        const segs = raw.split('.');
        const memberPath = new Array<string>(segs.length);
        for (let i = 0; i < segs.length; i++) {
            memberPath[i] = this.#decodeSeg(segs[i]!);
        }
        return { kind, memberPath };
    }
}
