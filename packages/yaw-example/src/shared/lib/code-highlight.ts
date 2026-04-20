const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'break', 'continue', 'new', 'this', 'super', 'import', 'export', 'from',
    'as', 'type', 'interface', 'enum', 'public', 'private', 'protected',
    'readonly', 'static', 'abstract', 'async', 'await', 'yield', 'throw',
    'try', 'catch', 'finally', 'declare', 'override', 'void', 'never',
    'undefined', 'null', 'true', 'false', 'typeof', 'instanceof', 'in', 'of',
]);

export const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escape = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    escapeHtml(String.raw({ raw: strings }, ...values)).replace(/\{\{/g, '\\{{');

export const dedent = (s: string): string => {
    const body = s.replace(/^\n+/, '').replace(/\s+$/, '');
    const lines = body.split('\n');
    const widths = lines
        .filter((l) => l.trim().length > 0)
        .map((l) => /^ */.exec(l)?.[0].length ?? 0);
    const indent = widths.length > 0 ? Math.min(...widths) : 0;
    return indent > 0 ? lines.map((l) => l.slice(indent)).join('\n') : lines.join('\n');
};

const TOKEN_RE = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`)|('(?:\\.|[^'\\])*')|("(?:\\.|[^"\\])*")|(@[A-Za-z_$][\w$]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export const highlightTs = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        const text = m[0];
        let cls: string;
        if (m[1] !== undefined || m[2] !== undefined) cls = 'tk-comment';
        else if (m[3] !== undefined || m[4] !== undefined || m[5] !== undefined) cls = 'tk-string';
        else if (m[6] !== undefined) cls = 'tk-decorator';
        else if (m[7] !== undefined) cls = 'tk-number';
        else if (KEYWORDS.has(text)) cls = 'tk-keyword';
        else if (/^[A-Z]/.test(text)) cls = 'tk-type';
        else cls = 'tk-ident';
        out += `<span class="${cls}">${escapeHtml(text)}</span>`;
        last = m.index + text.length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const HTML_TOKEN_RE = /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w-]*)((?:\s+[a-zA-Z_:][\w:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)(>)/g;
const HTML_ATTR_RE = /([a-zA-Z_:][\w:.-]*)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const highlightAttrs = (attrs: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    HTML_ATTR_RE.lastIndex = 0;
    while ((m = HTML_ATTR_RE.exec(attrs)) !== null) {
        if (m.index > last) out += escapeHtml(attrs.slice(last, m.index));
        out += `<span class="tk-attr">${escapeHtml(m[1]!)}</span>`;
        if (m[2] !== undefined) out += escapeHtml(m[2]);
        if (m[3] !== undefined) {
            const valueCls = m[3].startsWith('"') || m[3].startsWith("'") ? 'tk-string' : 'tk-ident';
            out += `<span class="${valueCls}">${escapeHtml(m[3])}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < attrs.length) out += escapeHtml(attrs.slice(last));
    return out;
};

export const highlightHtml = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    HTML_TOKEN_RE.lastIndex = 0;
    while ((m = HTML_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        if (m[1] !== undefined) {
            out += `<span class="tk-comment">${escapeHtml(m[1])}</span>`;
        } else {
            const open = m[2]!;
            const tag = m[3]!;
            const attrs = m[4] ?? '';
            const selfClose = m[5] ?? '';
            const close = m[6]!;
            out += `<span class="tk-punct">${escapeHtml(open)}</span>`;
            out += `<span class="tk-tag">${escapeHtml(tag)}</span>`;
            if (attrs.length > 0) out += highlightAttrs(attrs);
            if (selfClose.length > 0) out += `<span class="tk-punct">${escapeHtml(selfClose)}</span>`;
            out += `<span class="tk-punct">${escapeHtml(close)}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};
