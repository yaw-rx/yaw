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

const PARENT_REF_PREFIX = /^(\s*)((?:parentRef\s*\.\s*)+)(.*)$/s;

const injectCarets = (expr: string, depth: number): string => {
    const m = PARENT_REF_PREFIX.exec(expr);
    const lead = m?.[1] ?? '';
    const extraHops = m !== null ? (m[2]!.match(/parentRef/g) ?? []).length : 0;
    const body = m?.[3] ?? expr;
    const totalDepth = depth + extraHops;
    if (totalDepth === 0) return expr;
    const caret = `${'^'.repeat(totalDepth)}.`;
    const n = body.length;
    let out = lead;
    let i = 0;
    while (i < n) {
        const c = body[i]!;
        if (/\s/.test(c)) { out += c; i++; continue; }
        if (c === "'" || c === '"') {
            const quote = c;
            out += c; i++;
            while (i < n && body[i] !== quote) { out += body[i]; i++; }
            if (i < n) { out += body[i]; i++; }
            continue;
        }
        if (/\d/.test(c) || (c === '-' && i + 1 < n && /\d/.test(body[i + 1]!))) {
            if (c === '-') { out += c; i++; }
            while (i < n && /[\d.]/.test(body[i]!)) { out += body[i]; i++; }
            continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            const start = i;
            i++;
            while (i < n && /[\w$]/.test(body[i]!)) i++;
            const ident = body.slice(start, i);
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
    const re = /\{\{([^}]+)\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let found = false;
    while ((m = re.exec(text)) !== null) {
        const expr = m[1]!;
        if (expr.trim() === '') {
            throw new TemplateWalkError(
                `empty binding "{{${expr}}}" -- wrap the literal with escape\`...\` to display, or provide an expression to bind.`
            );
        }
        found = true;
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
        const rxText = doc.createElement('rx-text');
        rxText.setAttribute('bind', injectCarets(expr, depth));
        frag.appendChild(rxText);
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
    for (const child of Array.from(el.childNodes)) { walk(child, childDepth); }
};

/**
 * Thrown by the template walker when input cannot be compiled to a valid binding.
 * The message names the offending syntax and points to the intended fix.
 */
export class TemplateWalkError extends Error {
    constructor(message: string) {
        super(`yaw template: ${message}`);
        this.name = 'TemplateWalkError';
    }
}

/**
 * Compiles a template string into its runtime form.
 *
 * The walker performs these rewrites on the parsed DOM:
 *   - Text nodes:  {{expr}}              => <rx-text bind="expr">
 *   - Attributes:  [attr]="expr"         => data-rx-bind-{attr}
 *                  [class.name]="expr"   => data-rx-class-{name}
 *                  onEvent="handler"     => data-rx-on-{event}
 *                  #ref                  => data-rx-ref="ref"
 *   - Tags:        built-in HTML tags    => rx-{tag} (mirror elements)
 *   - Expressions: up-walk carets "^" are injected for nested custom-element scopes.
 *
 * To display content verbatim (without any of the above), wrap it with {@link escape}
 * and read it with {@link readInert}. The walker does not traverse <template>.content.
 */
export const transformTemplate = (template: string): string => {
    const doc = new DOMParser().parseFromString(`<body>${template}</body>`, 'text/html');
    for (const child of Array.from(doc.body.childNodes)) walk(child, 0);
    return doc.body.innerHTML;
};

/**
 * Stage 2 -- HTML-parse escape. Encodes &, <, > as entities so the HTML parser
 * treats the content as text rather than markup.
 */
export const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Stage 3 -- walker escape (block mode). Tagged template that wraps content in
 * <template>, whose children live in a detached DocumentFragment and are
 * therefore invisible to {@link transformTemplate}. Content is joined raw (no
 * HTML escaping) -- use this when you already have safe HTML to shield from
 * the walker. For arbitrary source text, use {@link escape}.
 *
 * Pair with {@link readInert} at the consumer.
 */
const inert = (html: string): string => `<template>${html}</template>`;

/**
 * Stage 4 -- inert read protocol. Returns the textContent of an element's
 * <template> child (as produced by {@link inert} / {@link escape}), falling
 * back to the element's own textContent if no template child is present.
 */
export const readInert = (el: Element): string => {
    const tpl = el.querySelector(':scope > template');
    if (tpl instanceof HTMLTemplateElement) return tpl.content.textContent ?? '';
    return el.textContent ?? '';
};

/**
 * Tagged template for display-safe content. Composes {@link escapeHtml} (stage 2)
 * with {@link inert} (stage 3) so the output is inert to both HTML parsing and
 * template walking. Intended pair: {@link readInert} at the consumer side.
 *
 * @example
 *   <code-block lang="ts">${escape`${source}`}</code-block>
 */
export const escape = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    inert(escapeHtml(String.raw({ raw: strings }, ...values)));
