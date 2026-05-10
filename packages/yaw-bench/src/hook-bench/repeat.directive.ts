import { BehaviorSubject, type Subscription } from 'rxjs';
import { Directive, type ParsedBindingPath, type RxElementLike } from '@yaw-rx/core';
import { parseBindingPath, subscribeToBinding, type ParsedBinding } from '@yaw-rx/core/binding/path';
import { registerScopeHook, type ScopeHookResult } from '@yaw-rx/core/binding/hooks/scope';
import { registerBindingHook } from '@yaw-rx/core/binding/hooks/binding';
import { registerMutationHook } from '@yaw-rx/core/binding/hooks/mutation';
import { initElement, destroyElement } from '@yaw-rx/core/binding/native';

interface RepeatEntry {
    el: Element;
    subject: BehaviorSubject<unknown>;
    index$: BehaviorSubject<unknown>;
}

const PROP = '__repeatScope';

// ---------------------------------------------------------------------------
// Scope hook
// ---------------------------------------------------------------------------

let lastClaim: { host: Element; segment: string; dir: Repeat; el: Element } | undefined;

const findDirective = (host: Element, segment: string): { dir: Repeat; el: Element } | undefined => {
    if (lastClaim !== undefined && lastClaim.host === host && lastClaim.segment === segment) {
        return { dir: lastClaim.dir, el: lastClaim.el };
    }
    let el: Element | null = host.closest('[repeat]');
    while (el !== null) {
        const dir = (el as any)[PROP] as Repeat | undefined;
        if (dir !== undefined && dir.loopVars.includes(segment)) {
            lastClaim = { host, segment, dir, el };
            return { dir, el };
        }
        el = el.parentElement?.closest('[repeat]') ?? null;
    }
    return undefined;
};

registerScopeHook({
    claim(host: Element, segment: string): boolean {
        return findDirective(host, segment) !== undefined;
    },
    resolve(host: Element, segment: string): ScopeHookResult {
        const { dir, el: repeatEl } = findDirective(host, segment)!;

        let itemEl: Element | null = host;
        while (itemEl !== null && itemEl.parentElement !== repeatEl) {
            itemEl = itemEl.parentElement;
        }

        const key = itemEl?.getAttribute('data-key');
        const entry = key !== null ? dir.entries.get(key!) : undefined;

        if (entry === undefined) {
            return { stream: new BehaviorSubject<unknown>(undefined), consumed: 1 };
        }

        if (segment === dir.indexName) {
            return { stream: entry.index$ as unknown as BehaviorSubject<unknown>, consumed: 1 };
        }

        return { stream: entry.subject, consumed: segment === dir.itemName ? 1 : 0 };
    },
});

// ---------------------------------------------------------------------------
// Binding hook
// ---------------------------------------------------------------------------

const stampedEls = new WeakSet<Element>();

registerBindingHook({
    claim(el: Element): boolean {
        return stampedEls.has(el);
    },
    transform(el: Element, binding$) {
        stampedEls.delete(el);
        return binding$;
    },
});

// ---------------------------------------------------------------------------
// Mutation hook
// ---------------------------------------------------------------------------

let pendingAdded: Element[] = [];
let pendingRemoved: Element[] = [];
let mutScheduled = false;

const flushMutations = (): void => {
    mutScheduled = false;
    const removed = pendingRemoved;
    const added = pendingAdded;
    pendingRemoved = [];
    pendingAdded = [];
    for (const el of removed) destroyElement(el);
    for (const el of added) initElement(el);
};

registerMutationHook({
    claim(target: Element): boolean {
        return target.hasAttribute('repeat');
    },
    handle(added: Element[], removed: Element[]): void {
        pendingAdded.push(...added);
        pendingRemoved.push(...removed);
        if (!mutScheduled) {
            mutScheduled = true;
            requestAnimationFrame(() => setTimeout(flushMutations, 0));
        }
    },
});

// ---------------------------------------------------------------------------
// Directive
// ---------------------------------------------------------------------------

@Directive({ selector: '[repeat]' })
export class Repeat {
    node!: RxElementLike;

    itemName: string | undefined;
    indexName: string | undefined;
    loopVars: string[] = [];
    entries = new Map<string, RepeatEntry>();

    private source!: ParsedBinding;
    private keyField: string | undefined;
    private content = '';
    private sub: Subscription | undefined;

    parseBindingPath(raw: string): ParsedBindingPath {
        let expr = raw.trim();
        const byIdx = expr.lastIndexOf(' by ');
        if (byIdx !== -1) {
            this.keyField = expr.slice(byIdx + 4).trim();
            expr = expr.slice(0, byIdx).trim();
        }
        const ofIdx = expr.indexOf(' of ');
        this.itemName = expr.slice(0, ofIdx).trim();
        const srcPart = expr.slice(ofIdx + 4).trim();

        const comma = this.itemName.indexOf(',');
        if (comma !== -1) {
            this.indexName = this.itemName.slice(comma + 1).trim();
            this.itemName = this.itemName.slice(0, comma).trim();
            this.loopVars = [this.itemName, this.indexName];
        } else {
            this.loopVars = [this.itemName];
        }

        this.source = parseBindingPath(srcPart);
        return { raw };
    }

    onInit(): void {
        (this.node as any)[PROP] = this;
        this.content = this.node.innerHTML;
        while (this.node.firstChild) this.node.removeChild(this.node.firstChild);
        this.sub = subscribeToBinding(this.node, this.source, (v) => {
            this.update(v as unknown[]);
        });
    }

    private update(incoming: unknown[]): void {
        const seen = new Set<string>();
        for (let i = 0; i < incoming.length; i++) {
            const item = incoming[i]!;
            const key = this.keyField
                ? String((item as Record<string, unknown>)[this.keyField])
                : String(i);
            seen.add(key);
            const existing = this.entries.get(key);
            if (existing !== undefined) {
                existing.subject.next(item);
                existing.index$.next(i);
            } else {
                const subject = new BehaviorSubject<unknown>(item);
                const index$ = new BehaviorSubject<unknown>(i);
                const tpl = document.createElement('template');
                tpl.innerHTML = this.content;
                const frag = tpl.content;
                const el = frag.firstElementChild!;
                el.setAttribute('data-rx-item', '');
                el.setAttribute('data-key', key);
                stampedEls.add(el);
                this.entries.set(key, { el, subject, index$ });
                this.node.appendChild(frag);
            }
        }
        for (const [key, entry] of this.entries) {
            if (!seen.has(key)) {
                entry.el.remove();
                entry.subject.complete();
                entry.index$.complete();
                this.entries.delete(key);
            }
        }
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
        delete (this.node as any)[PROP];
        for (const entry of this.entries.values()) {
            entry.subject.complete();
            entry.index$.complete();
        }
        this.entries.clear();
    }
}
