/**
 * rx-for - list rendering directive.
 *
 * Attach `rx-for="expression"` to any element. The expression must resolve
 * to an Observable that emits arrays. On each emission the directive creates,
 * updates, or removes child elements to match the incoming array.
 *
 * Two modes, determined by the presence of `of` in the expression:
 *
 * Splat mode (no `of`):
 *   `rx-for="rows by id"` - existing behaviour. Each item's properties are
 *   assigned directly onto the child element. The child is typically a
 *   component with @state fields, and setting a property triggers its
 *   BehaviorSubject. The key field defaults to "id" if omitted.
 *
 * Scope mode (`of` present):
 *   `rx-for="row of rows by id"` - declares loop variables. `row` is a
 *   name the author introduces. Inside the rx-for, bindings that start
 *   with `row` resolve through a per-item BehaviorSubject owned by the
 *   directive. Bindings that don't match a loop variable fall through to
 *   the host as normal. The host-is-scope rule is unchanged.
 *
 *   Accepted forms:
 *     row of rows              - item variable, no key
 *     row, i of rows           - item + index variable
 *     row of rows by id        - item + keyed reconciliation
 *     row, i of rows by id     - item + index + keyed
 *     { a, b } of rows by id   - destructured fields as loop variables
 *     { a, b }, i of rows by id - destructured + index
 *
 * Scope mode integrates with the binding system via a hook exported by
 * path.ts (registerScopeHook). The directive registers a function at
 * module import time that checks whether a binding's first path segment
 * is a loop variable. This keeps the directive modular - the core binding
 * system has no dependency on rx-for.
 *
 * Reconciliation:
 *   Keyed (by <field>) - items matched by key, DOM reordered to match
 *   source order. Identity-preserving across emissions.
 *   Keyless - items matched by position. Reordering updates in place,
 *   no DOM moves. data-rx-key carries the positional index.
 *
 * Clone attributes (scope mode only):
 *   data-rx-item - structural marker on every item element.
 *   data-rx-key  - always present. Derived from key field or position.
 *
 * The directive is optional - include it in the directives array at
 * bootstrap, or omit it entirely. The core framework has no dependency
 * on it.
 */
import { BehaviorSubject, type Subscription } from 'rxjs';
import { isObservable } from '../classify/is-observable.js';
import { Directive } from '../directive.js';
import { BindingParseError } from '../errors.js';
import { parseBindingPath, subscribeToBinding, deferredBinding, resolveValue, type ParsedBinding } from '../binding/path.js';
import { registerScopeHook, type ScopeHookResult } from '../binding/hooks/scope.js';
import type { RxElementLike } from '../directive.js';
import { isHydrating } from '../hydrate/state.js';
import { getTemplate } from '../component.js';

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface RxForParsed {
    mode: 'splat' | 'scope';
    source: ParsedBinding;
    keyField: string | undefined;
    itemName: string | undefined;
    destructuredFields: string[] | undefined;
    indexName: string | undefined;
    loopVariables: string[];
}

const parseRxFor = (raw: string): RxForParsed => {
    let expr = raw.trim();

    // strip leading const/let
    if (expr.startsWith('const ') || expr.startsWith('let ')) {
        expr = expr.slice(expr.indexOf(' ') + 1).trim();
    }

    // split "by <key>" from the end
    let keyField: string | undefined;
    const byIdx = expr.lastIndexOf(' by ');
    if (byIdx !== -1) {
        keyField = expr.slice(byIdx + 4).trim();
        if (keyField === '') throw new BindingParseError(raw, 'rx-for expected key identifier after "by"');
        expr = expr.slice(0, byIdx).trim();
    }

    // detect scope mode: look for " of "
    const ofIdx = expr.indexOf(' of ');
    if (ofIdx === -1) {
        // splat mode - the whole expression (minus "by") is the source
        const source = parseBindingPath(expr);
        return { mode: 'splat', source, keyField, itemName: undefined, destructuredFields: undefined, indexName: undefined, loopVariables: [] };
    }

    // scope mode: left of " of " declares loop variables, right is source
    const declPart = expr.slice(0, ofIdx).trim();
    const sourcePart = expr.slice(ofIdx + 4).trim();

    if (sourcePart === '') throw new BindingParseError(raw, 'rx-for expected source after "of"');
    if (declPart === '') throw new BindingParseError(raw, 'rx-for expected item identifier or destructure');

    const source = parseBindingPath(sourcePart);
    let itemName: string | undefined;
    let destructuredFields: string[] | undefined;
    let indexName: string | undefined;

    // parse the declaration part: could be "{a, b}, i" or "row, i" or "row" or "{a, b}"
    let remaining = declPart;

    if (remaining.startsWith('{')) {
        // destructure mode
        const closeIdx = remaining.indexOf('}');
        if (closeIdx === -1) throw new BindingParseError(raw, 'rx-for destructure expected "}"');
        const inner = remaining.slice(1, closeIdx).trim();
        if (inner === '') throw new BindingParseError(raw, 'rx-for destructure must declare at least one field');
        destructuredFields = inner.split(',').map(s => s.trim()).filter(s => s !== '');
        if (destructuredFields.length === 0) throw new BindingParseError(raw, 'rx-for destructure must declare at least one field');
        remaining = remaining.slice(closeIdx + 1).trim();
    } else {
        // single ident mode - read the first identifier
        const commaIdx = remaining.indexOf(',');
        if (commaIdx !== -1) {
            itemName = remaining.slice(0, commaIdx).trim();
            remaining = remaining.slice(commaIdx).trim();
        } else {
            itemName = remaining.trim();
            remaining = '';
        }
        if (itemName === '') throw new BindingParseError(raw, 'rx-for expected item identifier or destructure');
    }

    // check for index: ", i"
    if (remaining.startsWith(',')) {
        remaining = remaining.slice(1).trim();
        if (remaining === '') throw new BindingParseError(raw, 'rx-for expected index identifier after ","');
        if (remaining.includes(',')) throw new BindingParseError(raw, 'rx-for accepts at most one index identifier after the item');
        indexName = remaining.trim();
    } else if (remaining !== '') {
        throw new BindingParseError(raw, `rx-for accepts at most "item, index" - use { ... } to destructure fields`);
    }

    // build declared idents list
    const loopVariables: string[] = [];
    if (destructuredFields) {
        loopVariables.push(...destructuredFields);
    } else if (itemName) {
        loopVariables.push(itemName);
    }
    if (indexName) loopVariables.push(indexName);

    return { mode: 'scope', source, keyField, itemName, destructuredFields, indexName, loopVariables };
};

// ---------------------------------------------------------------------------
// Scope hook - registered once at module load
// ---------------------------------------------------------------------------

interface ScopeEntry {
    el: Element;
    subject: BehaviorSubject<unknown>;
    index$: BehaviorSubject<unknown> | undefined;
    pos: number;
}

const enum DiffOp { Clear, CreateAll, ReplaceAll, DataOnly, Reorder, AppendOnly, RemoveOnly, Mixed }

interface DiffResult { op: DiffOp; keys: string[] }

const keyOf = (item: unknown, keyField: string | undefined, index: number): string =>
    keyField ? String((item as Record<string, unknown>)[keyField]) : String(index);

const buildKeys = (incoming: unknown[], keyField: string | undefined): string[] => {
    const keys: string[] = new Array(incoming.length);
    for (let i = 0; i < incoming.length; i++) keys[i] = keyOf(incoming[i], keyField, i);
    return keys;
};

const classifyDiff = (
    incoming: unknown[],
    nodes: Map<string, { pos: number }>,
    keyField: string | undefined,
): DiffResult => {
    if (incoming.length === 0) return { op: DiffOp.Clear, keys: [] };
    if (nodes.size === 0) return { op: DiffOp.CreateAll, keys: buildKeys(incoming, keyField) };

    const firstKey = keyOf(incoming[0], keyField, 0);

    if (!nodes.has(firstKey)) {
        const lastKey = keyOf(incoming[incoming.length - 1], keyField, incoming.length - 1);
        if (!nodes.has(lastKey)) {
            const keys = buildKeys(incoming, keyField);
            return { op: DiffOp.ReplaceAll, keys };
        }
    }

    if (incoming.length > nodes.size) {
        const existingCount = nodes.size;
        const lastExistingKey = keyOf(incoming[existingCount - 1], keyField, existingCount - 1);
        const firstNewKey = keyOf(incoming[existingCount], keyField, existingCount);
        if (nodes.has(lastExistingKey) && !nodes.has(firstNewKey)) {
            const keys = buildKeys(incoming, keyField);
            return { op: DiffOp.AppendOnly, keys };
        }
    }

    const keys = buildKeys(incoming, keyField);
    let newCount = 0;
    let orderOk = true;
    let lastPos = -1;

    for (const key of keys) {
        const entry = nodes.get(key);
        if (entry === undefined) {
            newCount++;
        } else {
            if (entry.pos <= lastPos) orderOk = false;
            lastPos = entry.pos;
        }
    }

    if (newCount === incoming.length) return { op: DiffOp.ReplaceAll, keys };

    const kept = incoming.length - newCount;
    const removedCount = nodes.size - kept;

    if (newCount === 0 && removedCount === 0 && orderOk) return { op: DiffOp.DataOnly, keys };
    if (newCount === 0 && removedCount === 0) return { op: DiffOp.Reorder, keys };
    if (newCount > 0 && removedCount === 0 && orderOk) return { op: DiffOp.AppendOnly, keys };
    if (newCount === 0 && removedCount > 0 && orderOk) return { op: DiffOp.RemoveOnly, keys };

    return { op: DiffOp.Mixed, keys };
};

const SCOPE_PROP = '__rxForScope';

let lastClaim: { host: Element; segment: string; directive: RxFor; el: Element } | undefined;

const findDirective = (host: Element, segment: string): { directive: RxFor; el: Element } | undefined => {
    if (lastClaim !== undefined && lastClaim.host === host && lastClaim.segment === segment) {
        return { directive: lastClaim.directive, el: lastClaim.el };
    }
    let rxForEl: Element | null = host.closest('[rx-for]');
    while (rxForEl !== null) {
        const directive = (rxForEl as any)[SCOPE_PROP] as RxFor | undefined;
        if (directive !== undefined && directive.mode === 'scope' && directive.loopVariables.includes(segment)) {
            lastClaim = { host, segment, directive, el: rxForEl };
            return { directive, el: rxForEl };
        }
        rxForEl = rxForEl.parentElement?.closest('[rx-for]') ?? null;
    }
    return undefined;
};

registerScopeHook({
    claim(host: Element, segment: string): boolean {
        return findDirective(host, segment) !== undefined;
    },
    resolve(host: Element, segment: string): ScopeHookResult {
        const { directive, el: rxForEl } = findDirective(host, segment)!;

        let itemEl: Element | null = host as Element;
        while (itemEl !== null && itemEl.parentElement !== rxForEl) {
            itemEl = itemEl.parentElement;
        }

        const key = itemEl?.getAttribute('data-rx-key');
        const entry = key !== null ? directive.scopeNodes.get(key!) : undefined;

        if (entry === undefined) {
            return { stream: new BehaviorSubject<unknown>(undefined), consumed: 1 };
        }

        if (segment === directive.indexName) {
            return { stream: (entry.index$ ?? new BehaviorSubject<unknown>(undefined)) as BehaviorSubject<unknown>, consumed: 1 };
        }

        if (segment === directive.itemName) {
            return { stream: entry.subject, consumed: 1 };
        }

        return { stream: entry.subject, consumed: 0 };
    },
});

// ---------------------------------------------------------------------------
// Directive
// ---------------------------------------------------------------------------

/**
 * List rendering directive. Parses the expression in the `rx-for`
 * attribute, subscribes to the source observable, and stamps/removes
 * child elements to match the emitted array. Supports splat mode
 * (properties assigned directly onto children) and scope mode
 * (loop variables resolved through the binding system via a scope hook).
 */
@Directive({ selector: '[rx-for]' })
export class RxFor {
    node!: RxElementLike;

    mode: 'splat' | 'scope' = 'splat';
    loopVariables: string[] = [];
    indexName: string | undefined;
    scopeNodes = new Map<string, ScopeEntry>();

    itemName: string | undefined;

    private source!: ParsedBinding;
    private keyField: string | undefined;
    private sub: Subscription | undefined;
    private content = '';
    private tpl: HTMLTemplateElement | undefined;
    private splatNodes = new Map<string, { el: Element; pos: number }>();

    private assertArray(v: unknown): asserts v is unknown[] {
        if (!Array.isArray(v))
            throw new BindingParseError(this.source.raw, `rx-for expected array, got ${typeof v}`);
    }

    /**
     * Parses the rx-for expression, determines the mode, and subscribes
     * to the source observable.
     * @returns {void}
     */
    onInit(): void {
        const raw = this.node.getAttribute('rx-for') ?? '';
        const p = parseRxFor(raw);

        this.mode = p.mode;
        this.source = p.source;
        this.keyField = p.keyField;
        this.itemName = p.itemName;
        this.indexName = p.indexName;
        this.loopVariables = p.loopVariables;

        if (this.mode === 'splat') {
            this.initSplat();
        } else {
            this.initScope();
        }
    }

    private initSplat(): void {
        if (isHydrating()) {
            this.hydrateSplat();
            this.sub = deferredBinding(this.node, this.source).subscribe((v) => {
                this.assertArray(v);
                this.updateSplat(v);
            });
        } else {
            this.content = this.node.innerHTML;
            this.parseContent();
            this.node.replaceChildren();
            this.sub = subscribeToBinding(this.node, this.source, (v) => {
                this.assertArray(v);
                this.updateSplat(v);
            });
        }
    }

    private parseContent(): void {
        const tpl = document.createElement('template');
        tpl.innerHTML = this.content;
        this.tpl = tpl;
    }

    private recoverTemplate(): void {
        const hostCtor = Object.prototype.hasOwnProperty.call(this.node, 'hostNode')
            ? this.node.hostNode.constructor
            : this.node.constructor;
        const rawTemplate = getTemplate(hostCtor);
        if (rawTemplate === undefined) return;
        const tpl = document.createElement('template');
        tpl.innerHTML = rawTemplate;
        const rxForEl = tpl.content.querySelector('[rx-for]');
        if (rxForEl !== null) {
            this.content = rxForEl.innerHTML;
            this.parseContent();
        }
    }

    private hydrateSplat(): void {
        this.recoverTemplate();
        let pos = 0;
        for (const child of Array.from(this.node.children)) {
            const k = child.getAttribute('data-rx-key');
            if (k !== null) this.splatNodes.set(k, { el: child, pos: pos++ });
        }
    }

    private updateSplat(incoming: unknown[]): void {
        const { op, keys } = classifyDiff(incoming, this.splatNodes, this.keyField ?? 'id');

        switch (op) {
            case DiffOp.Clear:
                this.splatNodes.clear();
                this.node.textContent = '';
                return;
            case DiffOp.CreateAll:
                for (let i = 0; i < incoming.length; i++) {
                    const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
                    const el = frag.firstElementChild!;
                    this.node.appendChild(frag);
                    for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                        (el as unknown as Record<string, unknown>)[prop] = val;
                    }
                    el.setAttribute('data-rx-key', keys[i]!);
                    this.splatNodes.set(keys[i]!, { el, pos: i });
                }
                return;
            case DiffOp.ReplaceAll:
                this.splatNodes.clear();
                this.node.textContent = '';
                for (let i = 0; i < incoming.length; i++) {
                    const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
                    const el = frag.firstElementChild!;
                    this.node.appendChild(frag);
                    for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                        (el as unknown as Record<string, unknown>)[prop] = val;
                    }
                    el.setAttribute('data-rx-key', keys[i]!);
                    this.splatNodes.set(keys[i]!, { el, pos: i });
                }
                return;
            case DiffOp.DataOnly:
                for (let i = 0; i < incoming.length; i++) {
                    const entry = this.splatNodes.get(keys[i]!)!;
                    for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                        (entry.el as unknown as Record<string, unknown>)[prop] = val;
                    }
                    entry.pos = i;
                }
                return;
            case DiffOp.Reorder: {
                let cursor = this.node.firstElementChild;
                for (let i = 0; i < keys.length; i++) {
                    const entry = this.splatNodes.get(keys[i]!)!;
                    for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                        (entry.el as unknown as Record<string, unknown>)[prop] = val;
                    }
                    entry.pos = i;
                    if (entry.el !== cursor) {
                        this.node.insertBefore(entry.el, cursor);
                    } else {
                        cursor = cursor!.nextElementSibling;
                    }
                }
                return;
            }
            case DiffOp.AppendOnly:
                for (let i = 0; i < incoming.length; i++) {
                    const key = keys[i]!;
                    const entry = this.splatNodes.get(key);
                    if (entry !== undefined) {
                        for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                            (entry.el as unknown as Record<string, unknown>)[prop] = val;
                        }
                        entry.pos = i;
                    } else {
                        const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
                        const el = frag.firstElementChild!;
                        this.node.appendChild(frag);
                        for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                            (el as unknown as Record<string, unknown>)[prop] = val;
                        }
                        el.setAttribute('data-rx-key', key);
                        this.splatNodes.set(key, { el, pos: i });
                    }
                }
                return;
            case DiffOp.RemoveOnly: {
                const keep = new Set(keys);
                for (const [key, entry] of this.splatNodes) {
                    if (!keep.has(key)) {
                        entry.el.remove();
                        this.splatNodes.delete(key);
                    }
                }
                for (let i = 0; i < incoming.length; i++) {
                    const entry = this.splatNodes.get(keys[i]!)!;
                    for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                        (entry.el as unknown as Record<string, unknown>)[prop] = val;
                    }
                    entry.pos = i;
                }
                return;
            }
            case DiffOp.Mixed: {
                const keep = new Set(keys);
                for (const [key, entry] of this.splatNodes) {
                    if (!keep.has(key)) {
                        entry.el.remove();
                        this.splatNodes.delete(key);
                    }
                }
                for (let i = 0; i < incoming.length; i++) {
                    const key = keys[i]!;
                    const entry = this.splatNodes.get(key);
                    if (entry !== undefined) {
                        for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                            (entry.el as unknown as Record<string, unknown>)[prop] = val;
                        }
                        entry.pos = i;
                    } else {
                        const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
                        const el = frag.firstElementChild!;
                        this.node.appendChild(frag);
                        for (const [prop, val] of Object.entries(incoming[i] as Record<string, unknown>)) {
                            (el as unknown as Record<string, unknown>)[prop] = val;
                        }
                        el.setAttribute('data-rx-key', key);
                        this.splatNodes.set(key, { el, pos: i });
                    }
                }
                let cursor = this.node.firstElementChild;
                for (let i = 0; i < keys.length; i++) {
                    const entry = this.splatNodes.get(keys[i]!)!;
                    if (entry.el !== cursor) {
                        this.node.insertBefore(entry.el, cursor);
                    } else {
                        cursor = cursor!.nextElementSibling;
                    }
                }
                return;
            }
        }
    }

    private initScope(): void {
        (this.node as any)[SCOPE_PROP] = this;

        if (isHydrating()) {
            this.hydrateScope();
            this.sub = deferredBinding(this.node, this.source).subscribe((v) => {
                this.assertArray(v);
                this.updateScope(v);
            });
        } else {
            this.content = this.node.innerHTML;
            this.parseContent();
            while (this.node.firstChild) this.node.removeChild(this.node.firstChild);
            this.sub = subscribeToBinding(this.node, this.source, (v) => {
                this.assertArray(v);
                this.updateScope(v);
            });
        }
    }

    private hydrateScope(): void {
        this.recoverTemplate();

        const keyField = this.keyField;
        let items: unknown[] = [];
        try {
            const val = resolveValue(this.node, this.source);
            if (Array.isArray(val)) {
                items = val;
            } else if (isObservable(val)) {
                val.subscribe(v => { if (Array.isArray(v)) items = v; }).unsubscribe();
            }
        } catch { /* source not yet available during hydration */ }

        const itemByKey = new Map<string, { item: unknown; index: number }>();
        for (let i = 0; i < items.length; i++) {
            const item = items[i]!;
            const k = keyField ? String((item as Record<string, unknown>)[keyField]) : String(i);
            itemByKey.set(k, { item, index: i });
        }

        for (const child of this.node.querySelectorAll(':scope > [data-rx-item]')) {
            const key = child.getAttribute('data-rx-key');
            if (key === null) continue;
            if (this.scopeNodes.has(key)) continue;
            const match = itemByKey.get(key);
            const subject = new BehaviorSubject<unknown>(match?.item);
            const index$ = this.indexName ? new BehaviorSubject<unknown>(match?.index) : undefined;
            this.scopeNodes.set(key, { el: child, subject, index$, pos: this.scopeNodes.size });
        }
    }

    private cloneItem(item: unknown, key: string, i: number): DocumentFragment {
        const subject = new BehaviorSubject<unknown>(item);
        const index$ = this.indexName ? new BehaviorSubject<unknown>(i) : undefined;
        const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
        const itemEl = frag.firstElementChild!;
        let el: Element | null = itemEl;
        while (el !== null) {
            el.setAttribute('data-rx-item', '');
            el.setAttribute('data-rx-key', key);
            el = el.nextElementSibling;
        }
        this.scopeNodes.set(key, { el: itemEl, subject, index$, pos: i });
        return frag;
    }

    private batchCreate(incoming: unknown[], keys: string[]): void {
        const batch = document.createDocumentFragment();
        for (let i = 0; i < incoming.length; i++) {
            batch.appendChild(this.cloneItem(incoming[i]!, keys[i]!, i));
        }
        this.node.appendChild(batch);
    }

    private updateData(incoming: unknown[], keys: string[]): void {
        for (let i = 0; i < incoming.length; i++) {
            const entry = this.scopeNodes.get(keys[i]!)!;
            entry.subject.next(incoming[i]!);
            if (entry.index$) entry.index$.next(i);
            entry.pos = i;
        }
    }

    private reorder(keys: string[]): void {
        let cursor = this.node.firstElementChild;
        for (let i = 0; i < keys.length; i++) {
            const entry = this.scopeNodes.get(keys[i]!)!;
            entry.pos = i;
            if (entry.el !== cursor) {
                this.node.insertBefore(entry.el, cursor);
            } else {
                cursor = cursor.nextElementSibling;
            }
        }
    }

    private appendOnly(incoming: unknown[], keys: string[]): void {
        const newItems: unknown[] = [];
        const newKeys: string[] = [];
        for (let i = 0; i < incoming.length; i++) {
            const key = keys[i]!;
            const entry = this.scopeNodes.get(key);
            if (entry !== undefined) {
                if (incoming[i] !== entry.subject.value) entry.subject.next(incoming[i]!);
                if (entry.index$) entry.index$.next(i);
                entry.pos = i;
            } else {
                newItems.push(incoming[i]!);
                newKeys.push(key);
            }
        }
        if (newItems.length > 0) {
            const startIndex = incoming.length - newItems.length;
            const batch = document.createDocumentFragment();
            for (let i = 0; i < newItems.length; i++) {
                batch.appendChild(this.cloneItem(newItems[i]!, newKeys[i]!, startIndex + i));
            }
            this.node.appendChild(batch);
        }
    }

    private removeOnly(incoming: unknown[], keys: string[]): void {
        const keep = new Set(keys);
        for (const [key, entry] of this.scopeNodes) {
            if (!keep.has(key)) {
                entry.el.remove();
                this.scopeNodes.delete(key);
            }
        }
        this.updateData(incoming, keys);
    }

    private mixed(incoming: unknown[], keys: string[]): void {
        const keep = new Set(keys);
        for (const [key, entry] of this.scopeNodes) {
            if (!keep.has(key)) {
                entry.el.remove();
                this.scopeNodes.delete(key);
            }
        }

        const newItems: unknown[] = [];
        const newKeys: string[] = [];
        let firstNewIndex = 0;
        for (let i = 0; i < incoming.length; i++) {
            const key = keys[i]!;
            const entry = this.scopeNodes.get(key);
            if (entry !== undefined) {
                entry.subject.next(incoming[i]!);
                if (entry.index$) entry.index$.next(i);
                entry.pos = i;
            } else {
                if (newItems.length === 0) firstNewIndex = i;
                newItems.push(incoming[i]!);
                newKeys.push(key);
            }
        }
        if (newItems.length > 0) {
            const batch = document.createDocumentFragment();
            for (let i = 0; i < newItems.length; i++) {
                batch.appendChild(this.cloneItem(newItems[i]!, newKeys[i]!, firstNewIndex + i));
            }
            this.node.appendChild(batch);
        }

        let cursor = this.node.firstElementChild;
        for (let i = 0; i < keys.length; i++) {
            const entry = this.scopeNodes.get(keys[i]!)!;
            if (entry.el !== cursor) {
                this.node.insertBefore(entry.el, cursor);
            } else {
                cursor = cursor.nextElementSibling;
            }
        }
    }

    private updateScope(incoming: unknown[]): void {
        const { op, keys } = classifyDiff(incoming, this.scopeNodes, this.keyField);

        switch (op) {
            case DiffOp.Clear:
                this.scopeNodes.clear();
                this.node.textContent = '';
                return;
            case DiffOp.CreateAll:
                this.batchCreate(incoming, keys);
                return;
            case DiffOp.ReplaceAll:
                this.scopeNodes.clear();
                this.node.textContent = '';
                this.batchCreate(incoming, keys);
                return;
            case DiffOp.DataOnly:
                this.updateData(incoming, keys);
                return;
            case DiffOp.Reorder:
                this.reorder(keys);
                return;
            case DiffOp.AppendOnly:
                this.appendOnly(incoming, keys);
                return;
            case DiffOp.RemoveOnly:
                this.removeOnly(incoming, keys);
                return;
            case DiffOp.Mixed:
                this.mixed(incoming, keys);
                return;
        }
    }

    /**
     * Unsubscribes from the source, completes all scope subjects,
     * and clears the node maps.
     * @returns {void}
     */
    onDestroy(): void {
        this.sub?.unsubscribe();
        if (this.mode === 'scope') {
            delete (this.node as any)[SCOPE_PROP];
            for (const entry of this.scopeNodes.values()) {
                entry.subject.complete();
                entry.index$?.complete();
            }
            this.scopeNodes.clear();
        } else {
            this.splatNodes.clear();
        }
    }
}
