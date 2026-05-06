import { marshaller } from './marshaller.js';

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

export const transformStyles = (css: string, host?: string): string => {
    if (host === undefined) return css;
    let inKeyframes = 0;
    return css.replace(/([^{}]*)([\{\}])/g, (_m, sel: string, brace: string) => {
        if (brace === '}') {
            if (inKeyframes > 0) inKeyframes--;
            return `${sel}}`;
        }
        if (sel.trim().startsWith('@keyframes') || sel.trim().startsWith('@-webkit-keyframes')) {
            inKeyframes = 1;
            return `${sel}{`;
        }
        if (inKeyframes > 0) {
            inKeyframes++;
            return `${sel}{`;
        }
        return `${scopeSelector(sel, host)}{`;
    });
};

const KEYWORDS = new Set(['true', 'false', 'null', '$event']);

const injectCarets = (bindingPath: string, depth: number): string => {
    if (depth === 0) return bindingPath;
    const caret = '^'.repeat(depth);
    const n = bindingPath.length;
    let out = '';
    let i = 0;
    while (i < n) {
        const c = bindingPath[i]!;
        if (/\s/.test(c)) { out += c; i++; continue; }
        if (c === "'" || c === '"') {
            const quote = c;
            out += c; i++;
            while (i < n && bindingPath[i] !== quote) { out += bindingPath[i]; i++; }
            if (i < n) { out += bindingPath[i]; i++; }
            continue;
        }
        if (/\d/.test(c) || (c === '-' && i + 1 < n && /\d/.test(bindingPath[i + 1]!))) {
            if (c === '-') { out += c; i++; }
            while (i < n && /[\d.]/.test(bindingPath[i]!)) { out += bindingPath[i]; i++; }
            continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            const start = i;
            i++;
            while (i < n && /[\w$]/.test(bindingPath[i]!)) i++;
            const ident = bindingPath.slice(start, i);
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
        const bindingPath = m[1]!;
        if (bindingPath.trim() === '') {
            throw new TemplateWalkError(
                `empty binding path "{{${bindingPath}}}" -- wrap the literal with escape\`...\` to display, or provide a binding path.`
            );
        }
        found = true;
        if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
        const span = doc.createElement('span');
        span.setAttribute(marshaller.encode('text', []), injectCarets(bindingPath, depth));
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
        const tapMatch = /^\[\((.+)\)\]$/.exec(name);
        if (tapMatch !== null) {
            rewrites.push({ remove: name, add: [marshaller.encode('tap', tapMatch[1]!.split('.')), injectCarets(value, depth)] });
            continue;
        }
        const styleMatch = /^\[style\.(.+)\]$/.exec(name);
        if (styleMatch !== null) {
            rewrites.push({ remove: name, add: [marshaller.encode('style', [styleMatch[1]!]), injectCarets(value, depth)] });
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
 * Parses the template via DOMParser, then rewrites each node
 * depth-first:
 *
 *   - Text:       {{path}}              => <span data-rx-bind-text="path">
 *   - Property:   [prop]="path"         => data-rx-bind-prop-{prop}
 *   - Class:      [class.name]="path"   => data-rx-bind-class-{name}
 *   - Style:      [style.prop]="path"   => data-rx-bind-style-{prop}
 *   - Tap:        [(prop)]="path"       => data-rx-bind-tap-{prop}
 *   - Event:      onEvent="handler"     => data-rx-bind-on-{event}
 *   - Ref:        #name                 => data-rx-bind-ref-{name}
 *   - Carets:     "^" prefixed per host boundary depth in nested custom elements.
 *
 * To display content verbatim, wrap with {@link escape} and read
 * with {@link readInert}. The walker does not traverse template
 * element content.
 */
export const transformTemplate = (template: string): string => {
    const doc = new DOMParser().parseFromString(`<body>${template}</body>`, 'text/html');
    for (const child of Array.from(doc.body.childNodes)) walk(child, 0);
    return doc.body.innerHTML;
};
