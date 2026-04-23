import type { BindKind, BindMarshaller, BindMarshallerResult } from './bind-marshaller.js';

const MID_WORD: Record<string, string> = {
    'css': 'CSS',
    'html': 'HTML',
    'ns': 'NS',
    'svg': 'SVG',
    'uri': 'URI',
    'url': 'URL',
    'xml': 'XML',
};

const LEADING: Record<string, string> = {
    'moz': 'Moz',
    'webkit': 'Webkit',
};

const PREFIX = 'data-rx-bind-';

const KINDS: BindKind[] = ['class', 'style', 'attr', 'prop', 'ref', 'on'];

export class ReplaceAndLookupBindMarshaller implements BindMarshaller {
    #encodeSeg(seg: string): string {
        return seg
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }

    #decodeSeg(seg: string): string {
        const camel = seg.replace(/-([a-z]+)/g, (_, part: string) => {
            const mid = MID_WORD[part];
            if (mid !== undefined) return mid;
            return part.charAt(0).toUpperCase() + part.slice(1);
        });
        const firstWord = camel.match(/^[a-z]+/)?.[0];
        if (firstWord !== undefined && LEADING[firstWord] !== undefined) {
            return LEADING[firstWord] + camel.slice(firstWord.length);
        }
        return camel;
    }

    encode(kind: BindKind, memberPath?: string[]): string {
        if (memberPath === undefined || memberPath.length === 0) return `${PREFIX}${kind}`;
        return `${PREFIX}${kind}-${memberPath.map(s => this.#encodeSeg(s)).join('.')}`;
    }

    decode(attr: string): BindMarshallerResult | undefined {
        if (!attr.startsWith(PREFIX)) return undefined;
        const rest = attr.slice(PREFIX.length);

        for (const kind of KINDS) {
            if (rest === kind) return { kind, memberPath: [] };
            if (rest.startsWith(kind + '-')) {
                const raw = rest.slice(kind.length + 1);
                return { kind, memberPath: kind === 'style' ? [raw] : raw.split('.').map(s => this.#decodeSeg(s)) };
            }
        }

        if (rest === 'text') return { kind: 'text', memberPath: [] };
        return undefined;
    }
}
