import { SingleRegexBindMarshaller } from './bind-marshaller/single-regex.js';
import { memoiseBindMarshaller } from './bind-marshaller/memoise-bind-marshaller.js';

export const marshaller = memoiseBindMarshaller(new SingleRegexBindMarshaller());

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
    host !== undefined
        ? css.replace(/([^{}]*)\{/g, (_m, sel: string) => `${scopeSelector(sel, host)}{`)
        : css;

const KEYWORDS = new Set(['true', 'false', 'null', '$event']);

const PARENT_REF_PREFIX = /^(\s*)((?:parentRef\s*\.\s*)+)(.*)$/s;

const injectCarets = (expr: string, depth: number): string => {
    const m = PARENT_REF_PREFIX.exec(expr);
    const lead = m?.[1] ?? '';
    const extraHops = m !== null ? (m[2]!.match(/parentRef/g) ?? []).length : 0;
    const body = m?.[3] ?? expr;
    const totalDepth = depth + extraHops;
    if (totalDepth === 0) return expr;
    const caret = '^'.repeat(totalDepth);
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
        const span = doc.createElement('span');
        span.setAttribute(marshaller.encode('text', []), injectCarets(expr, depth));
        frag.appendChild(span);
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
            rewrites.push({ remove: name, add: [marshaller.encode('class', [classMatch[1]!]), injectCarets(value, depth)] });
            continue;
        }
        const modelMatch = /^\[\((.+)\)\]$/.exec(name);
        if (modelMatch !== null) {
            rewrites.push({ remove: name, add: [marshaller.encode('model', modelMatch[1]!.split('.')), injectCarets(value, depth)] });
            continue;
        }
        const bindMatch = /^\[(.+)\]$/.exec(name);
        if (bindMatch !== null) {
            rewrites.push({ remove: name, add: [marshaller.encode('prop', bindMatch[1]!.split('.')), injectCarets(value, depth)] });
            continue;
        }
        const onMatch = /^on(.+)$/.exec(name);
        if (onMatch !== null && value !== '') {
            rewrites.push({ remove: name, add: [marshaller.encode('on', [onMatch[1]!]), injectCarets(value, depth)] });
            continue;
        }
        if (name.startsWith('#')) {
            rewrites.push({ remove: name, add: [marshaller.encode('ref', [name.slice(1)]), injectCarets(name.slice(1), depth)] });
            continue;
        }
    }
    for (const { remove, add } of rewrites) {
        el.removeAttribute(remove);
        if (add !== undefined) el.setAttribute(add[0], add[1]);
    }
};

const walk = (node: Node, depth: number): void => {
    if (node.nodeType === 3) {
        transformTextNode(node as Text, depth);
        return;
    }
    if (node.nodeType !== 1) return;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'template') {
        const text = (el as HTMLTemplateElement).content.textContent ?? '';
        el.replaceWith(node.ownerDocument!.createTextNode(text));
        return;
    }

    transformAttributes(el, depth);

    const childDepth = tag.includes('-') ? depth + 1 : depth;
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
 *   - Text nodes:  {{expr}}              => <span data-rx-bind-text="expr">
 *   - Attributes:  [attr]="expr"         => data-rx-bind-{attr}
 *                  [class.name]="expr"   => data-rx-class-{name}
 *                  onEvent="handler"     => data-rx-on-{event}
 *                  #ref                  => data-rx-ref="ref"
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
