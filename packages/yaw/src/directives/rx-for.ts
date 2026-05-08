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
import { BehaviorSubject, skip, type Subscription } from 'rxjs';
import { isObservable } from '../classify/is-observable.js';
import { Directive } from '../directive.js';
import { BindingParseError } from '../errors.js';
import { parseBindingPath, subscribeToBinding, deferredBinding, resolveValue, type ParsedBinding } from '../binding/path.js';
import { registerScopeHook, type ScopeHookResult } from '../binding/hooks/scope.js';
import { registerMutationHook } from '../binding/hooks/mutation.js';
import { registerBindingHook } from '../binding/hooks/binding.js';
import { initElement, destroyElement } from '../binding/native.js';
import { resolveStamp, type StampSource } from '../stamp/resolve.js';
import { analyseTemplate, type StampInstruction } from '../stamp/analyse.js';
import { writeStamp, collectElements } from '../stamp/write.js';
import type { RxElementLike } from '../directive.js';
import type { Injector } from '../di/injector.js';
import { isHydrating } from '../hydrate/state.js';
import { getTemplate, getProviders, isComponent } from '../component.js';
import { getInjectMetadata } from '../di/inject.js';
import { resolveInjector } from '../di/resolve.js';

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
    scopeNodes: Map<string, ScopeEntry>,
    keyField: string | undefined,
): DiffResult => {
    if (incoming.length === 0) return { op: DiffOp.Clear, keys: [] };
    if (scopeNodes.size === 0) return { op: DiffOp.CreateAll, keys: buildKeys(incoming, keyField) };

    const firstKey = keyOf(incoming[0], keyField, 0);

    // all new keys -- no overlap with existing
    if (!scopeNodes.has(firstKey)) {
        const lastKey = keyOf(incoming[incoming.length - 1], keyField, incoming.length - 1);
        if (!scopeNodes.has(lastKey)) {
            const keys = buildKeys(incoming, keyField);
            return { op: DiffOp.ReplaceAll, keys };
        }
    }

    // append: same count of existing keys at the front, new keys at the tail
    if (incoming.length > scopeNodes.size) {
        const existingCount = scopeNodes.size;
        const lastExistingKey = keyOf(incoming[existingCount - 1], keyField, existingCount - 1);
        const firstNewKey = keyOf(incoming[existingCount], keyField, existingCount);
        if (scopeNodes.has(lastExistingKey) && !scopeNodes.has(firstNewKey)) {
            const keys = buildKeys(incoming, keyField);
            return { op: DiffOp.AppendOnly, keys };
        }
    }

    // full scan for remaining cases
    const keys = buildKeys(incoming, keyField);
    let newCount = 0;
    let orderOk = true;
    let lastPos = -1;

    for (const key of keys) {
        const entry = scopeNodes.get(key);
        if (entry === undefined) {
            newCount++;
        } else {
            if (entry.pos <= lastPos) orderOk = false;
            lastPos = entry.pos;
        }
    }

    if (newCount === incoming.length) return { op: DiffOp.ReplaceAll, keys };

    const kept = incoming.length - newCount;
    const removedCount = scopeNodes.size - kept;

    if (newCount === 0 && removedCount === 0 && orderOk) return { op: DiffOp.DataOnly, keys };
    if (newCount === 0 && removedCount === 0) return { op: DiffOp.Reorder, keys };
    if (newCount > 0 && removedCount === 0 && orderOk) return { op: DiffOp.AppendOnly, keys };
    if (newCount === 0 && removedCount > 0 && orderOk) return { op: DiffOp.RemoveOnly, keys };

    return { op: DiffOp.Mixed, keys };
};

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
                // consumed = 1 - subscribeToBinding skips "row" and processes remaining segments
                if (segment === directive.itemName) {
                    return { stream: entry.subject, consumed: 1 };
                }

                // destructured field (e.g. "name" from "{ name, status } of rows"):
                // return the item subject, consumed = 0 - subscribeToBinding processes "name"
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
// Binding hook -- skip(1) for stamped elements so the first
// subscription emission does not overwrite stamped values.
// ---------------------------------------------------------------------------

const stampedElements = new WeakSet<Element>();

registerBindingHook((el, binding$) =>
    stampedElements.has(el) ? binding$.pipe(skip(1)) : binding$
);

// ---------------------------------------------------------------------------
// Mutation hook -- splices records targeting rx-for elements,
// defers binding setup (added) and teardown (removed) to after paint.
// rAF syncs with the frame, schedule pushes past paint.
// ---------------------------------------------------------------------------

// The way schedulers were meant to be written ;)
const schedule =
    typeof scheduler !== 'undefined' && scheduler.postTask
        ? (cb: () => void) => { void scheduler.postTask(cb); }
        : (cb: () => void) => { setTimeout(cb, 1); };

let pendingAdded: Element[] = [];
let pendingRemoved: Element[] = [];
let scheduled = false;

const flushPending = (): void => {
    scheduled = false;
    const removed = pendingRemoved;
    const added = pendingAdded;
    pendingRemoved = [];
    pendingAdded = [];
    for (const el of removed) destroyElement(el);
    for (const el of added) initElement(el);
};

registerMutationHook((records) => {
    let claimed = false;
    for (let i = records.length - 1; i >= 0; i--) {
        const target = records[i]!.target;
        if (!(target instanceof Element) || !target.hasAttribute('rx-for')) continue;
        for (const node of records[i]!.addedNodes) {
            if (node.nodeType === 1) pendingAdded.push(node as Element);
        }
        for (const node of records[i]!.removedNodes) {
            if (node.nodeType === 1) pendingRemoved.push(node as Element);
        }
        records.splice(i, 1);
        claimed = true;
    }
    if (claimed && !scheduled) {
        scheduled = true;
        requestAnimationFrame(() => schedule(flushPending));
    }
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
    private stampInstructions: StampInstruction[] | undefined;
    private splatNodes = new Map<unknown, Element>();
    private ancestorCache = new Map<number, Element>();
    private cachedHost: RxElementLike | null = null;
    private cachedInjector: Injector | undefined;
    private innerAnalysisCache = new Map<string, StampInstruction[]>();
    private parentRxFor: RxFor | undefined;
    private parentEntry: ScopeEntry | undefined;

    resolveAncestor(carets: number): Element | undefined {
        const cached = this.ancestorCache.get(carets);
        if (cached !== undefined) return cached;
        let host: Element | null = this.node.parentElement?.closest('[data-rx-host]') ?? null;
        for (let i = 0; i < carets; i++) {
            if (host === null) return undefined;
            host = host.parentElement?.closest('[data-rx-host]') ?? null;
        }
        if (host === null) return undefined;
        this.ancestorCache.set(carets, host);
        return host;
    }

    classifySource(instruction: StampInstruction): StampSource {
        const path = instruction.bindingPath.path;
        const segment = path[0]!;

        if (this.loopVariables.includes(segment)) {
            if (segment === this.indexName) {
                return { kind: 'index' };
            }
            if (segment === this.itemName) {
                return { kind: 'item', segments: path.slice(1) };
            }
            return { kind: 'item', segments: path };
        }

        // check cached parent rx-for
        if (this.parentRxFor !== undefined && this.parentRxFor.loopVariables.includes(segment)) {
            if (segment === this.parentRxFor.indexName) {
                return { kind: 'shared', root: this.parentEntry?.index$?.value, segments: [] };
            }
            const root = this.parentEntry?.subject.value;
            if (segment === this.parentRxFor.itemName) {
                return { kind: 'shared', root, segments: path.slice(1) };
            }
            return { kind: 'shared', root, segments: path };
        }

        // host binding
        const host = this.resolveAncestor(instruction.bindingPath.carets);
        return { kind: 'shared', root: host, segments: path };
    }

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

    private expandCustomElements(root: Node): void {
        let child = root.firstChild;
        while (child !== null) {
            if (child.nodeType === 1) {
                const el = child as Element;
                const tag = el.tagName.toLowerCase();
                const ctor = tag.includes('-') ? customElements.get(tag) : undefined;
                if (ctor !== undefined) {
                    const tpl = getTemplate(ctor);
                    if (tpl !== undefined) {
                        el.innerHTML = tpl;
                        this.expandCustomElements(el);
                    }
                } else {
                    this.expandCustomElements(el);
                }
            }
            child = child.nextSibling;
        }
    }

    private cacheTemplate(): void {
        this.tpl = document.createElement('template');
        this.tpl.innerHTML = this.content;
        this.expandCustomElements(this.tpl.content);
        this.cachedHost = this.node.closest('[data-rx-host]') as RxElementLike | null;
        this.cachedInjector = resolveInjector(this.node);
        if (this.mode === 'scope') {
            const host = this.resolveAncestor(0);
            if (host !== undefined) {
                this.stampInstructions = analyseTemplate(this.tpl.content, host);
            }
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
            this.cacheTemplate();
            this.node.replaceChildren();
            this.sub = subscribeToBinding(this.node, this.source, (v) => {
                this.assertArray(v);
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
        if (rxForEl !== null) {
            this.content = rxForEl.innerHTML;
            this.cacheTemplate();
        }
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
                const frag = this.tpl!.content.cloneNode(true) as DocumentFragment;
                el = frag.firstElementChild!;
                this.node.appendChild(frag);
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

    private resolveParent(): void {
        const parentEl = this.node.parentElement?.closest('[rx-for]') ?? null;
        if (parentEl === null) return;
        const parent = (parentEl as any)[SCOPE_PROP] as RxFor | undefined;
        if (parent === undefined || parent.mode !== 'scope') return;
        this.parentRxFor = parent;
        const itemEl = (this.node as Element).closest('[data-rx-key]');
        const key = itemEl?.getAttribute('data-rx-key');
        if (key !== null && key !== undefined) this.parentEntry = parent.scopeNodes.get(key);
    }

    private initScope(): void {
        (this.node as any)[SCOPE_PROP] = this;
        this.resolveParent();

        if (isHydrating()) {
            this.hydrateScope();
            this.sub = deferredBinding(this.node, this.source).subscribe((v) => {
                this.assertArray(v);
                this.updateScope(v);
            });
        } else {
            this.content = this.node.innerHTML;
            this.cacheTemplate();
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

    private upgradeWalk(root: Node, host: RxElementLike | null, parentInjector: Injector): void {
        let child = root.firstChild;
        while (child !== null) {
            if (child.nodeType === 1) {
                const el = child as Element;
                const tag = el.tagName.toLowerCase();
                const ctor = tag.includes('-') ? customElements.get(tag) : undefined;
                if (ctor !== undefined) {
                    customElements.upgrade(el);
                    const rxEl = el as unknown as RxElementLike;
                    if (isComponent(ctor)) el.setAttribute('data-rx-host', '');
                    if (host !== null) rxEl.hostNode = host;
                    const providers = getProviders(ctor);
                    const childInjector = providers !== undefined
                        ? parentInjector.child(providers)
                        : parentInjector;
                    if (providers !== undefined) rxEl.__injector = childInjector;
                    const injectMeta = getInjectMetadata(ctor);
                    if (injectMeta !== undefined) {
                        for (const [prop, token] of injectMeta) {
                            (rxEl as unknown as Record<string | symbol, unknown>)[prop] = childInjector.resolve(token);
                        }
                    }
                    this.upgradeWalk(el, rxEl, childInjector);
                } else {
                    this.upgradeWalk(el, host, parentInjector);
                }
            }
            child = child.nextSibling;
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
        this.upgradeWalk(frag, this.cachedHost, this.cachedInjector!);
        this.scopeNodes.set(key, { el: itemEl, subject, index$, pos: i });
        return frag;
    }

    private stampInner(root: Element): void {
        const tag = root.tagName.toLowerCase();
        let instructions = this.innerAnalysisCache.get(tag);
        if (instructions === undefined) {
            instructions = analyseTemplate(root, root);
            this.innerAnalysisCache.set(tag, instructions);
        }
        if (instructions.length > 0) {
            const elements = collectElements(root);
            const values = resolveStamp(instructions, [root], (_inst) => {
                return { kind: 'shared', root, segments: _inst.bindingPath.path };
            });
            const finish = (vals: unknown[]): void => {
                writeStamp(elements, instructions!, vals, 0);
                for (const el of elements) stampedElements.add(el);
            };
            if (values instanceof Promise) {
                void values.then(finish);
            } else {
                finish(values);
            }
        }
        let child = root.firstElementChild;
        while (child !== null) {
            const childTag = child.tagName.toLowerCase();
            if (childTag.includes('-') && customElements.get(childTag) !== undefined) {
                this.stampInner(child);
            }
            child = child.nextElementSibling;
        }
    }

    private stampBatch(items: unknown[], keys: string[], startIndex: number): DocumentFragment | Promise<DocumentFragment> {
        const batch = document.createDocumentFragment();
        const instructions = this.stampInstructions;
        const N = items.length;

        const elementArrays: Element[][] = new Array(N);
        for (let i = 0; i < N; i++) {
            const frag = this.cloneItem(items[i]!, keys[i]!, startIndex + i);
            elementArrays[i] = collectElements(frag);
            batch.appendChild(frag);
        }

        if (instructions === undefined || instructions.length === 0) return batch;

        const K = instructions.length;
        const classifier = (inst: StampInstruction): StampSource => this.classifySource(inst);
        const resolved = resolveStamp(instructions, items, classifier);

        const finish = (values: unknown[]): DocumentFragment => {
            for (let i = 0; i < N; i++) {
                writeStamp(elementArrays[i]!, instructions, values, i * K);
                for (const el of elementArrays[i]!) stampedElements.add(el);
            }
            for (let i = 0; i < N; i++) {
                for (const el of elementArrays[i]!) {
                    const tag = el.tagName.toLowerCase();
                    if (tag.includes('-') && customElements.get(tag) !== undefined) {
                        this.stampInner(el);
                    }
                }
            }
            return batch;
        };

        return resolved instanceof Promise ? resolved.then(finish) : finish(resolved);
    }

    private appendBatch(result: DocumentFragment | Promise<DocumentFragment>): void {
        if (result instanceof Promise) {
            void result.then(batch => this.node.appendChild(batch));
        } else {
            this.node.appendChild(result);
        }
    }

    private batchCreate(incoming: unknown[], keys: string[]): void {
        this.appendBatch(this.stampBatch(incoming, keys, 0));
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
        let firstNewIndex = 0;
        for (let i = 0; i < incoming.length; i++) {
            const key = keys[i]!;
            const entry = this.scopeNodes.get(key);
            if (entry !== undefined) {
                if (incoming[i] !== entry.subject.value) entry.subject.next(incoming[i]!);
                if (entry.index$) entry.index$.next(i);
                entry.pos = i;
            } else {
                if (newItems.length === 0) firstNewIndex = i;
                newItems.push(incoming[i]!);
                newKeys.push(key);
            }
        }
        if (newItems.length > 0) {
            this.appendBatch(this.stampBatch(newItems, newKeys, firstNewIndex));
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
            this.appendBatch(this.stampBatch(newItems, newKeys, firstNewIndex));
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
        this.ancestorCache.clear();
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
