/**
 * rx-for — list rendering directive.
 *
 * Attach `rx-for="expression"` to any element. The expression must resolve
 * to an Observable that emits arrays. On each emission the directive creates,
 * updates, or removes child elements to match the incoming array.
 *
 * Two modes, determined by the presence of `of` in the expression:
 *
 * Splat mode (no `of`):
 *   `rx-for="rows by id"` — existing behaviour. Each item's properties are
 *   assigned directly onto the child element. The child is typically a
 *   component with @state fields, and setting a property triggers its
 *   BehaviorSubject. The key field defaults to "id" if omitted.
 *
 * Scope mode (`of` present):
 *   `rx-for="row of rows by id"` — declares loop variables. `row` is a
 *   name the author introduces. Inside the rx-for, bindings that start
 *   with `row` resolve through a per-item BehaviorSubject owned by the
 *   directive. Bindings that don't match a loop variable fall through to
 *   the host as normal. The host-is-scope rule is unchanged.
 *
 *   Accepted forms:
 *     row of rows              — item variable, no key
 *     row, i of rows           — item + index variable
 *     row of rows by id        — item + keyed reconciliation
 *     row, i of rows by id     — item + index + keyed
 *     { a, b } of rows by id   — destructured fields as loop variables
 *     { a, b }, i of rows by id — destructured + index
 *
 * Scope mode integrates with the binding system via a hook exported by
 * bind.ts (registerScopeHook). The directive registers a function at
 * module import time that checks whether a binding's first path segment
 * is a loop variable. This keeps the directive modular — the core binding
 * system has no dependency on rx-for.
 *
 * Reconciliation:
 *   Keyed (by <field>) — items matched by key, DOM reordered to match
 *   source order. Identity-preserving across emissions.
 *   Keyless — items matched by position. Reordering updates in place,
 *   no DOM moves. data-rx-key carries the positional index.
 *
 * Clone attributes (scope mode only):
 *   data-rx-item — structural marker on every item element.
 *   data-rx-key  — always present. Derived from key field or position.
 *
 * The directive is optional — include it in the directives array at
 * bootstrap, or omit it entirely. The core framework has no dependency
 * on it.
 */
import { BehaviorSubject, type Subscription } from 'rxjs';
import { isObservable } from '../is-observable.js';
import { Directive } from '../directive.js';
import { BindParseError } from '../errors.js';
import { parseBind, subscribeBind, hydratedBind, resolveValue, registerScopeHook, type ParsedBind, type ScopeHookResult } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';
import { isHydrating } from '../rx-element.js';
import { getTemplate } from '../component.js';

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface RxForParsed {
    mode: 'splat' | 'scope';
    source: ParsedBind;
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
        if (keyField === '') throw new BindParseError(raw, 'rx-for expected key identifier after "by"');
        expr = expr.slice(0, byIdx).trim();
    }

    // detect scope mode: look for " of "
    const ofIdx = expr.indexOf(' of ');
    if (ofIdx === -1) {
        // splat mode — the whole expression (minus "by") is the source
        const source = parseBind(expr);
        return { mode: 'splat', source, keyField, itemName: undefined, destructuredFields: undefined, indexName: undefined, loopVariables: [] };
    }

    // scope mode: left of " of " declares loop variables, right is source
    const declPart = expr.slice(0, ofIdx).trim();
    const sourcePart = expr.slice(ofIdx + 4).trim();

    if (sourcePart === '') throw new BindParseError(raw, 'rx-for expected source after "of"');
    if (declPart === '') throw new BindParseError(raw, 'rx-for expected item identifier or destructure');

    const source = parseBind(sourcePart);
    let itemName: string | undefined;
    let destructuredFields: string[] | undefined;
    let indexName: string | undefined;

    // parse the declaration part: could be "{a, b}, i" or "row, i" or "row" or "{a, b}"
    let remaining = declPart;

    if (remaining.startsWith('{')) {
        // destructure mode
        const closeIdx = remaining.indexOf('}');
        if (closeIdx === -1) throw new BindParseError(raw, 'rx-for destructure expected "}"');
        const inner = remaining.slice(1, closeIdx).trim();
        if (inner === '') throw new BindParseError(raw, 'rx-for destructure must declare at least one field');
        destructuredFields = inner.split(',').map(s => s.trim()).filter(s => s !== '');
        if (destructuredFields.length === 0) throw new BindParseError(raw, 'rx-for destructure must declare at least one field');
        remaining = remaining.slice(closeIdx + 1).trim();
    } else {
        // single ident mode — read the first identifier
        const commaIdx = remaining.indexOf(',');
        if (commaIdx !== -1) {
            itemName = remaining.slice(0, commaIdx).trim();
            remaining = remaining.slice(commaIdx).trim();
        } else {
            itemName = remaining.trim();
            remaining = '';
        }
        if (itemName === '') throw new BindParseError(raw, 'rx-for expected item identifier or destructure');
    }

    // check for index: ", i"
    if (remaining.startsWith(',')) {
        remaining = remaining.slice(1).trim();
        if (remaining === '') throw new BindParseError(raw, 'rx-for expected index identifier after ","');
        if (remaining.includes(',')) throw new BindParseError(raw, 'rx-for accepts at most one index identifier after the item');
        indexName = remaining.trim();
    } else if (remaining !== '') {
        throw new BindParseError(raw, `rx-for accepts at most "item, index" — use { … } to destructure fields`);
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
// Scope hook — registered once at module load
// ---------------------------------------------------------------------------

interface ScopeEntry {
    el: Element;
    subject: BehaviorSubject<unknown>;
    index$: BehaviorSubject<unknown> | undefined;
}

const SCOPE_PROP = '__rxForScope';

registerScopeHook((host: Element, segment: string): ScopeHookResult | undefined => {
    let rxForEl: Element | null = host.closest('[rx-for]');
    while (rxForEl !== null) {
        const directive = (rxForEl as any)[SCOPE_PROP] as RxFor | undefined;
        if (directive !== undefined && directive.mode === 'scope') {
            if (directive.loopVariables.includes(segment)) {
                // find the item element: walk up from host to direct child of rxForEl
                let itemEl: Element | null = host as Element;
                while (itemEl !== null && itemEl.parentElement !== rxForEl) {
                    itemEl = itemEl.parentElement;
                }
                if (itemEl === null) return undefined;

                const key = itemEl.getAttribute('data-rx-key');
                if (key === null) return undefined;

                const entry = directive.scopeNodes.get(key);
                if (entry === undefined) return undefined;

                // index variable: return the index subject, consumed = 1 (skip the name)
                if (segment === directive.indexName) {
                    if (entry.index$ === undefined) return undefined;
                    return { stream: entry.index$ as unknown as BehaviorSubject<unknown>, consumed: 1 };
                }

                // item variable (e.g. "row" in "row of rows"): return the item subject,
                // consumed = 1 — subscribeBind skips "row" and processes remaining segments
                if (segment === directive.itemName) {
                    return { stream: entry.subject, consumed: 1 };
                }

                // destructured field (e.g. "name" from "{ name, status } of rows"):
                // return the item subject, consumed = 0 — subscribeBind processes "name"
                // as a path segment on the item object via segmentStream
                return { stream: entry.subject, consumed: 0 };
            }
        }
        // hop to next rx-for outward
        rxForEl = rxForEl.parentElement?.closest('[rx-for]') ?? null;
    }
    return undefined;
});

// ---------------------------------------------------------------------------
// Directive
// ---------------------------------------------------------------------------

@Directive({ selector: '[rx-for]' })
export class RxFor {
    node!: RxElementLike;

    mode: 'splat' | 'scope' = 'splat';
    loopVariables: string[] = [];
    indexName: string | undefined;
    scopeNodes = new Map<string, ScopeEntry>();

    itemName: string | undefined;

    private source!: ParsedBind;
    private keyField: string | undefined;
    private sub: Subscription | undefined;
    private content = '';
    private splatNodes = new Map<unknown, Element>();

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
            this.sub = hydratedBind(this.node, this.source).subscribe((v) => {
                if (!Array.isArray(v)) {
                    throw new BindParseError(this.source.raw, `rx-for expected array, got ${typeof v}`);
                }
                this.updateSplat(v);
            });
        } else {
            this.content = this.node.innerHTML;
            this.node.replaceChildren();
            this.sub = subscribeBind(this.node, this.source, (v) => {
                if (!Array.isArray(v)) {
                    throw new BindParseError(this.source.raw, `rx-for expected array, got ${typeof v}`);
                }
                this.updateSplat(v);
            });
        }
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
        if (rxForEl !== null) this.content = rxForEl.innerHTML;
    }

    private hydrateSplat(): void {
        this.recoverTemplate();
        for (const child of Array.from(this.node.children)) {
            const k = child.getAttribute('data-rx-key');
            if (k !== null) this.splatNodes.set(k, child);
        }
    }

    private updateSplat(incoming: unknown[]): void {
        const key = this.keyField ?? 'id';
        const next = new Map<unknown, Element>();
        for (const item of incoming) {
            const k = String((item as Record<string, unknown>)[key]);
            let el = this.splatNodes.get(k);
            if (el === undefined) {
                this.node.insertAdjacentHTML('beforeend', this.content);
                el = this.node.lastElementChild!;
            }
            for (const [prop, val] of Object.entries(item as Record<string, unknown>)) {
                (el as unknown as Record<string, unknown>)[prop] = val;
            }
            el.setAttribute('data-rx-key', k);
            next.set(k, el);
        }
        for (const [k, el] of this.splatNodes) {
            if (!next.has(k)) el.remove();
        }
        this.splatNodes = next;
    }

    private initScope(): void {
        (this.node as any)[SCOPE_PROP] = this;

        if (isHydrating()) {
            this.hydrateScope();
            this.sub = hydratedBind(this.node, this.source).subscribe((v) => {
                if (!Array.isArray(v)) {
                    throw new BindParseError(this.source.raw, `rx-for expected array, got ${typeof v}`);
                }
                this.updateScope(v);
            });
        } else {
            this.content = this.node.innerHTML;
            while (this.node.firstChild) this.node.removeChild(this.node.firstChild);
            this.sub = subscribeBind(this.node, this.source, (v) => {
                if (!Array.isArray(v)) {
                    throw new BindParseError(this.source.raw, `rx-for expected array, got ${typeof v}`);
                }
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
            const match = itemByKey.get(key);
            const subject = new BehaviorSubject<unknown>(match?.item);
            const index$ = this.indexName ? new BehaviorSubject<unknown>(match?.index) : undefined;
            this.scopeNodes.set(key, { el: child, subject, index$ });
        }
    }

    private updateScope(incoming: unknown[]): void {
        const seen = new Set<string>();

        for (let i = 0; i < incoming.length; i++) {
            const item = incoming[i]!;
            const key = this.keyField
                ? String((item as Record<string, unknown>)[this.keyField])
                : String(i);
            seen.add(key);

            const existing = this.scopeNodes.get(key);
            if (existing !== undefined) {
                // update existing item
                existing.subject.next(item);
                if (existing.index$) existing.index$.next(i);
                // reorder if needed (keyed mode)
                if (this.keyField) {
                    const expectedPrev = i > 0
                        ? this.scopeNodes.get(
                            this.keyField
                                ? String((incoming[i - 1] as Record<string, unknown>)[this.keyField])
                                : String(i - 1)
                        )?.el ?? null
                        : null;
                    if (existing.el.previousElementSibling !== expectedPrev) {
                        this.node.appendChild(existing.el);
                    }
                }
            } else {
                // stamp new item
                const subject = new BehaviorSubject<unknown>(item);
                const index$ = this.indexName ? new BehaviorSubject<unknown>(i) : undefined;

                // parse template into a DocumentFragment so we can set attributes
                // before connecting to the DOM (children's connectedCallback needs
                // data-rx-item and data-rx-key to be present)
                const tpl = document.createElement('template');
                tpl.innerHTML = this.content;
                const frag = tpl.content;
                const itemEl = frag.firstElementChild!;
                itemEl.setAttribute('data-rx-item', '');
                itemEl.setAttribute('data-rx-key', key);

                const entry: ScopeEntry = { el: itemEl, subject, index$ };
                this.scopeNodes.set(key, entry);

                this.node.appendChild(frag);

                // after appendChild, itemEl is now in the DOM — update entry ref
                // (the element reference stays valid after appendChild from fragment)
            }
        }

        // remove items no longer in the array
        for (const [key, entry] of this.scopeNodes) {
            if (!seen.has(key)) {
                entry.subject.complete();
                entry.index$?.complete();
                entry.el.remove();
                this.scopeNodes.delete(key);
            }
        }
    }

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
