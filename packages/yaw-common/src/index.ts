export const htmlTags = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
    'b', 'bdi', 'bdo', 'blockquote', 'br', 'button',
    'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
    'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
    'em', 'embed',
    'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'i', 'iframe', 'img', 'input', 'ins',
    'kbd',
    'label', 'legend', 'li', 'link',
    'main', 'map', 'mark', 'menu', 'meter',
    'nav',
    'object', 'ol', 'optgroup', 'option', 'output',
    'p', 'picture', 'pre', 'progress',
    'q',
    's', 'samp', 'search', 'section', 'select', 'slot', 'small', 'source', 'span',
    'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track',
    'u', 'ul',
    'var', 'video',
    'wbr',
] as const;

const blockOnly = [
    'address', 'article', 'aside', 'details', 'dialog', 'div',
    'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'header', 'hgroup', 'legend',
    'main', 'menu', 'nav', 'search', 'section', 'summary',
] as const;

const inlineBlock = [
    'button', 'img', 'input', 'label', 'meter', 'progress', 'select', 'textarea',
    'audio', 'video', 'canvas', 'iframe',
] as const;

export const mirrorStyles: ReadonlyMap<string, string> = new Map<string, string>([
    ...blockOnly.map((t) => [t, 'display:block'] as [string, string]),
    ...inlineBlock.map((t) => [t, 'display:inline-block'] as [string, string]),
    ['slot', 'display:contents'],
    ['table', 'display:table'],
    ['caption', 'display:table-caption'],
    ['col', 'display:table-column'],
    ['colgroup', 'display:table-column-group'],
    ['tbody', 'display:table-row-group'],
    ['td', 'display:table-cell'],
    ['tfoot', 'display:table-footer-group'],
    ['th', 'display:table-cell;font-weight:bold;text-align:center'],
    ['thead', 'display:table-header-group'],
    ['tr', 'display:table-row'],
    ['h1', 'display:block;font-size:2em;font-weight:bold;margin:0.67em 0'],
    ['h2', 'display:block;font-size:1.5em;font-weight:bold;margin:0.83em 0'],
    ['h3', 'display:block;font-size:1.17em;font-weight:bold;margin:1em 0'],
    ['h4', 'display:block;font-weight:bold;margin:1.33em 0'],
    ['h5', 'display:block;font-size:0.83em;font-weight:bold;margin:1.67em 0'],
    ['h6', 'display:block;font-size:0.67em;font-weight:bold;margin:2.33em 0'],
    ['p', 'display:block;margin:1em 0'],
    ['blockquote', 'display:block;margin:1em 40px'],
    ['pre', 'display:block;font-family:monospace;white-space:pre;margin:1em 0'],
    ['hr', 'display:block;border-style:inset;border-width:1px;margin:0.5em auto'],
    ['ul', 'display:block;list-style-type:disc;padding-inline-start:40px;margin:1em 0'],
    ['ol', 'display:block;list-style-type:decimal;padding-inline-start:40px;margin:1em 0'],
    ['li', 'display:list-item'],
    ['dl', 'display:block;margin:1em 0'],
    ['dd', 'display:block;margin-inline-start:40px'],
    ['code', 'font-family:monospace'],
    ['kbd', 'font-family:monospace'],
    ['samp', 'font-family:monospace'],
    ['strong', 'font-weight:bold'],
    ['b', 'font-weight:bold'],
    ['em', 'font-style:italic'],
    ['i', 'font-style:italic'],
    ['cite', 'font-style:italic'],
    ['dfn', 'font-style:italic'],
    ['var', 'font-style:italic'],
    ['u', 'text-decoration:underline'],
    ['ins', 'text-decoration:underline'],
    ['s', 'text-decoration:line-through'],
    ['del', 'text-decoration:line-through'],
    ['mark', 'background-color:yellow;color:black'],
    ['small', 'font-size:smaller'],
    ['sub', 'vertical-align:sub;font-size:smaller'],
    ['sup', 'vertical-align:super;font-size:smaller'],
    ['a', 'color:#06c;text-decoration:underline;cursor:pointer'],
]);

const htmlTagSet = new Set(htmlTags);

const rewriteSelectorTags = (selectors: string): string =>
    selectors.replace(/(^|[\s>+~,(])([a-z][a-z0-9]*)\b/g, (match, prefix: string, tag: string) =>
        htmlTagSet.has(tag as (typeof htmlTags)[number]) ? `${prefix}rx-${tag}` : match
    );

const scopeSelector = (sel: string, host: string): string => {
    const trimmed = sel.trim();
    if (trimmed === '' || trimmed.startsWith('@')) return sel;
    return sel.split(',').map((part) => {
        const t = part.trim();
        if (t === '') return part;
        if (t === ':host') return host;
        if (t.startsWith(':host')) return `${host}${t.slice(5)}`;
        return `${host} ${t}`;
    }).join(', ');
};

export const transformStyles = (css: string, host?: string): string =>
    css.replace(/([^{}]*)\{/g, (_m, sel: string) => {
        const rewritten = rewriteSelectorTags(sel);
        return `${host !== undefined ? scopeSelector(rewritten, host) : rewritten}{`;
    });

const KEYWORDS = new Set(['true', 'false', 'null', '$event']);

const injectCarets = (expr: string, depth: number): string => {
    if (depth === 0) return expr;
    const caret = `${'^'.repeat(depth)}.`;
    const n = expr.length;
    let out = '';
    let i = 0;
    while (i < n) {
        const c = expr[i]!;
        if (/\s/.test(c)) { out += c; i++; continue; }
        if (c === "'" || c === '"') {
            const quote = c;
            out += c; i++;
            while (i < n && expr[i] !== quote) { out += expr[i]; i++; }
            if (i < n) { out += expr[i]; i++; }
            continue;
        }
        if (/\d/.test(c) || (c === '-' && i + 1 < n && /\d/.test(expr[i + 1]!))) {
            if (c === '-') { out += c; i++; }
            while (i < n && /[\d.]/.test(expr[i]!)) { out += expr[i]; i++; }
            continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            const start = i;
            i++;
            while (i < n && /[\w$]/.test(expr[i]!)) i++;
            const ident = expr.slice(start, i);
            const lastMeaningful = out.replace(/\s+$/, '').slice(-1);
            const isContinuation = lastMeaningful === '.';
            if (!KEYWORDS.has(ident) && !isContinuation) out += caret;
            out += ident;
            continue;
        }
        out += c; i++;
    }
    return out;
};

const transformTextNode = (node: Text, depth: number): void => {
    const text = node.data;
    if (!text.includes('{{')) return;
    const parent = node.parentNode;
    if (parent === null) return;

    const doc = node.ownerDocument!;
    const frag = doc.createDocumentFragment();
    const re = /(\\?)\{\{([^}]+)\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let found = false;
    while ((m = re.exec(text)) !== null) {
        found = true;
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
        if (m[1] === '\\') {
            frag.appendChild(doc.createTextNode(`{{${m[2]!}}}`));
        } else {
            const rxText = doc.createElement('rx-text');
            rxText.setAttribute('bind', injectCarets(m[2]!, depth));
            frag.appendChild(rxText);
        }
        last = m.index + m[0].length;
    }
    if (!found) return;
    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
};

const transformAttributes = (el: Element, depth: number): void => {
    const rewrites: Array<{ remove: string; add?: [string, string] }> = [];
    for (const attr of Array.from(el.attributes)) {
        const name = attr.name;
        const value = attr.value;

        const classMatch = /^\[class\.(.+)\]$/.exec(name);
        if (classMatch !== null) {
            rewrites.push({ remove: name, add: [`data-rx-class-${classMatch[1]}`, injectCarets(value, depth)] });
            continue;
        }
        const bindMatch = /^\[(.+)\]$/.exec(name);
        if (bindMatch !== null) {
            rewrites.push({ remove: name, add: [`data-rx-bind-${bindMatch[1]}`, injectCarets(value, depth)] });
            continue;
        }
        const onMatch = /^on(.+)$/.exec(name);
        if (onMatch !== null && value !== '') {
            rewrites.push({ remove: name, add: [`data-rx-on-${onMatch[1]}`, injectCarets(value, depth)] });
            continue;
        }
        if (name.startsWith('#')) {
            rewrites.push({ remove: name, add: ['data-rx-ref', injectCarets(name.slice(1), depth)] });
            continue;
        }
    }
    for (const { remove, add } of rewrites) {
        el.removeAttribute(remove);
        if (add !== undefined) el.setAttribute(add[0], add[1]);
    }
};

const renameElement = (el: Element, newTag: string): Element => {
    const doc = el.ownerDocument!;
    const next = doc.createElement(newTag);
    for (const attr of Array.from(el.attributes)) next.setAttribute(attr.name, attr.value);
    while (el.firstChild !== null) next.appendChild(el.firstChild);
    el.replaceWith(next);
    return next;
};

const walk = (node: Node, depth: number): void => {
    if (node.nodeType === 3) {
        transformTextNode(node as Text, depth);
        return;
    }
    if (node.nodeType !== 1) return;

    let el = node as Element;
    const tag = el.tagName.toLowerCase();
    const isHtml = htmlTagSet.has(tag as (typeof htmlTags)[number]);

    transformAttributes(el, depth);

    if (isHtml) el = renameElement(el, `rx-${tag}`);

    const childDepth = isHtml ? depth : depth + 1;
    for (const child of Array.from(el.childNodes)) walk(child, childDepth);
};

export const transformTemplate = (template: string): string => {
    const doc = new DOMParser().parseFromString(`<body>${template}</body>`, 'text/html');
    for (const child of Array.from(doc.body.childNodes)) walk(child, 0);
    return doc.body.innerHTML;
};
