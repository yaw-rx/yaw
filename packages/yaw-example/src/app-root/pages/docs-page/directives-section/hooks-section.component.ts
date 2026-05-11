import { Component, RxElement } from '@yaw-rx/core';
import { DocSection } from '../../../components/doc-section.component.js';
import { TocSection } from '../../../directives/toc-section.directive.js';
import { TocAnchor } from '../../../directives/toc-anchor.directive.js';
import { escape } from '@yaw-rx/common/escape';
import { ts, html } from '@yaw-rx/common/tags';
import '../../../components/code-block.component.js';
import './hooks-section/virtual-scroll-demo.component.js';

const MUTATION_HOOK_SOURCE = ts`import { registerMutationHook } from '@yaw-rx/core/binding/hooks/mutation';

// Claim the container so the framework delegates lifecycle to the directive.
// The directive calls initElement/destroyElement directly in stamp/recycle
// for synchronous binding setup — no flash between append and first paint.
registerMutationHook({
    claim(target: Element): boolean {
        return (target as any)['__virtualScroll'] !== undefined;
    },
    handle(): void {},
});`;

const SCOPE_HOOK_SOURCE = ts`import { registerScopeHook } from '@yaw-rx/core/binding/hooks/scope';

registerScopeHook({
    claim(host: Element, segment: string): boolean {
        const r = resolveVs(host);
        if (r === undefined) return false;
        return r.vs.loopVariables.includes(segment);
    },
    resolve(host: Element, segment: string) {
        const r = resolveVs(host);
        if (segment === r.vs.indexName)
            return { stream: r.vs.getIndexSubject(r.idx), consumed: 1 };
        return { stream: r.vs.getRowSubject(r.idx), consumed: 1 };
    },
});`;

const GRAMMAR_SOURCE = ts`import { parseRxFor } from '@yaw-rx/core/directives/rx-for';
import { subscribeToBinding } from '@yaw-rx/core/binding/path';

// expression: "row, i of items by id; 36, 5"
const [forExpr, settings] = raw.split(';').map(s => s.trim());
const [heightStr, bufferStr] = (settings ?? '').split(',').map(s => s.trim());
this.rowHeight = parseInt(heightStr ?? '36', 10);
this.buffer = parseInt(bufferStr ?? '10', 10);

const parsed = parseRxFor(forExpr);

// subscribe through the binding system
subscribeToBinding(this.node, parsed.source, (v) => {
    this.data = v;
    this.rebuild(v.length);
});`;

const FULL_SOURCE = ts`import { fromEvent, animationFrameScheduler, BehaviorSubject, type Subscription } from 'rxjs';
import { throttleTime, map, distinctUntilChanged } from 'rxjs/operators';
import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { subscribeToBinding } from '@yaw-rx/core/binding/path';
import { parseRxFor, type RxForParsed } from '@yaw-rx/core/directives/rx-for';
import { isHydrating } from '@yaw-rx/core/hydrate/state';
import { registerMutationHook } from '@yaw-rx/core/binding/hooks/mutation';
import { registerScopeHook } from '@yaw-rx/core/binding/hooks/scope';
import { initElement, destroyElement } from '@yaw-rx/core/binding/native';

const SELECTOR = '[virtual-scroll]';
const PROP = '__virtualScroll';

registerMutationHook({
    claim(target: Element): boolean {
        return (target as any)[PROP] !== undefined;
    },
    handle(): void {},
});

const resolveVs = (host: Element): { vs: VirtualScroll; idx: number } | undefined => {
    const container = host.closest(SELECTOR);
    if (container === null) return undefined;
    const vs = (container as any)[PROP] as VirtualScroll | undefined;
    if (vs === undefined) return undefined;
    const key = host.closest('[data-vs-index]')?.getAttribute('data-vs-index') ?? null;
    const idx = key !== null ? parseInt(key, 10) : -1;
    return { vs, idx };
};

registerScopeHook({
    claim(host: Element, segment: string): boolean {
        const r = resolveVs(host);
        if (r === undefined) return false;
        return r.vs.loopVariables.includes(segment);
    },
    resolve(host: Element, segment: string) {
        const r = resolveVs(host);
        if (r === undefined) return { stream: new BehaviorSubject<unknown>(undefined), consumed: 1 };
        if (segment === r.vs.indexName) return { stream: r.vs.getIndexSubject(r.idx), consumed: 1 };
        return { stream: r.vs.getRowSubject(r.idx), consumed: 1 };
    },
});

interface VisibleRange { start: number; end: number }

@Directive({ selector: SELECTOR })
export class VirtualScroll {
    node!: RxElementLike;

    loopVariables: string[] = [];
    indexName: string | undefined;
    pool: HTMLElement[] = [];

    private parsed!: RxForParsed;
    private rowHeight = 0;
    private buffer = 10;
    private totalCount = 0;
    private rangeStart = 0;
    private rangeEnd = 0;
    private data: unknown[] = [];
    private rows: (HTMLElement | undefined)[] = [];
    private indexSubjects: (BehaviorSubject<unknown> | undefined)[] = [];
    private rowSubjects: (BehaviorSubject<unknown> | undefined)[] = [];
    private spacer!: HTMLElement;
    private tpl!: HTMLTemplateElement;
    private dataSub!: Subscription;
    private scrollSub!: Subscription;

    getIndexSubject(i: number): BehaviorSubject<unknown> {
        let s = this.indexSubjects[i];
        if (s === undefined) {
            s = new BehaviorSubject<unknown>(i);
            this.indexSubjects[i] = s;
        }
        return s;
    }

    getRowSubject(i: number): BehaviorSubject<unknown> {
        let s = this.rowSubjects[i];
        if (s === undefined) {
            s = new BehaviorSubject<unknown>(this.data[i]);
            this.rowSubjects[i] = s;
        }
        return s;
    }

    onInit(): void {
        const raw = this.node.getAttribute('virtual-scroll') ?? '';
        const [forExpr, settings] = raw.split(';').map(s => s.trim());
        const [heightStr, bufferStr] = (settings ?? '').split(',').map(s => s.trim());
        this.rowHeight = parseInt(heightStr ?? '36', 10);
        this.buffer = parseInt(bufferStr ?? '10', 10);

        this.parsed = parseRxFor(forExpr ?? '');
        this.loopVariables = this.parsed.loopVariables;
        this.indexName = this.parsed.indexName;

        (this.node as any)[PROP] = this;

        if (isHydrating()) {
            this.spacer = this.node.firstElementChild as HTMLElement;
            const firstRow = this.node.querySelector('[data-vs-index]') as HTMLElement | null;
            if (firstRow) {
                const tplRow = firstRow.cloneNode(true) as HTMLElement;
                tplRow.removeAttribute('data-vs-index');
                tplRow.removeAttribute('style');
                this.tpl = document.createElement('template');
                this.tpl.content.appendChild(tplRow);
            }
            this.dataSub = subscribeToBinding(this.node, this.parsed.source, (v) => {
                const incoming = v as unknown[];
                this.data = incoming;
                this.totalCount = incoming.length;
                this.rows = new Array(incoming.length);
                this.indexSubjects = new Array(incoming.length);
                this.rowSubjects = new Array(incoming.length);
                this.spacer.style.height = \`\${incoming.length * this.rowHeight}px\`;
                const existing = this.node.querySelectorAll<HTMLElement>('[data-vs-index]');
                existing.forEach(el => {
                    const idx = parseInt(el.getAttribute('data-vs-index')!, 10);
                    this.rows[idx] = el;
                });
                if (existing.length > 0) {
                    this.rangeStart = parseInt(existing[0]!.getAttribute('data-vs-index')!, 10);
                    this.rangeEnd = parseInt(existing[existing.length - 1]!.getAttribute('data-vs-index')!, 10) + 1;
                }
            });
        } else {
            this.tpl = document.createElement('template');
            this.tpl.innerHTML = this.node.innerHTML;
            this.node.replaceChildren();

            this.node.style.overflow = 'auto';
            this.node.style.position = 'relative';

            this.spacer = document.createElement('div');
            this.spacer.style.pointerEvents = 'none';
            this.node.appendChild(this.spacer);

            this.dataSub = subscribeToBinding(this.node, this.parsed.source, (v) => {
                const incoming = v as unknown[];
                this.data = incoming;
                this.rebuild(incoming.length);
            });
        }

        this.scrollSub = fromEvent(this.node, 'scroll').pipe(
            throttleTime(0, animationFrameScheduler, { leading: true, trailing: true }),
            map((): VisibleRange => {
                const scrollTop = this.node.scrollTop;
                const viewHeight = this.node.clientHeight;
                return {
                    start: Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer),
                    end: Math.min(this.totalCount, Math.ceil((scrollTop + viewHeight) / this.rowHeight) + this.buffer),
                };
            }),
            distinctUntilChanged((a, b) => a.start === b.start && a.end === b.end),
        ).subscribe(range => this.render(range));
    }

    onDestroy(): void {
        this.dataSub?.unsubscribe();
        this.scrollSub?.unsubscribe();
        for (let i = this.rangeStart; i < this.rangeEnd; i++) {
            const el = this.rows[i];
            if (el !== undefined) destroyElement(el);
        }
        this.rows.length = 0;
        this.pool.length = 0;
        this.indexSubjects.length = 0;
        this.rowSubjects.length = 0;
        delete (this.node as any)[PROP];
    }

    private rebuild(count: number): void {
        for (let i = this.rangeStart; i < this.rangeEnd; i++) this.recycle(i);
        this.rangeStart = 0;
        this.rangeEnd = 0;

        this.totalCount = count;
        this.rows = new Array(count);
        this.indexSubjects = new Array(count);
        this.rowSubjects = new Array(count);
        this.spacer.style.height = \`\${count * this.rowHeight}px\`;
        this.renderVisible();
    }

    private renderVisible(): void {
        const scrollTop = this.node.scrollTop;
        const viewHeight = this.node.clientHeight;
        this.render({
            start: Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.buffer),
            end: Math.min(this.totalCount, Math.ceil((scrollTop + viewHeight) / this.rowHeight) + this.buffer),
        });
    }

    private render(range: VisibleRange): void {
        for (let i = this.rangeStart; i < Math.min(this.rangeEnd, range.start); i++) {
            this.recycle(i);
        }
        for (let i = Math.max(this.rangeStart, range.end); i < this.rangeEnd; i++) {
            this.recycle(i);
        }

        for (let i = range.start; i < range.end; i++) {
            if (this.rows[i] !== undefined) continue;
            this.stamp(i);
        }

        this.rangeStart = range.start;
        this.rangeEnd = range.end;
    }

    private stamp(i: number): void {
        let el: HTMLElement;
        if (this.pool.length > 0) {
            el = this.pool.pop()!;
            this.getIndexSubject(i).next(i);
            this.getRowSubject(i).next(this.data[i]);
        } else {
            const frag = this.tpl.content.cloneNode(true) as DocumentFragment;
            el = frag.firstElementChild as HTMLElement;
        }
        el.style.position = 'absolute';
        el.style.top = \`\${i * this.rowHeight}px\`;
        el.style.left = '0';
        el.style.right = '0';
        el.style.height = \`\${this.rowHeight}px\`;
        el.setAttribute('data-vs-index', String(i));
        this.rows[i] = el;
        this.node.appendChild(el);
        initElement(el, this.node);
    }

    private recycle(i: number): void {
        const el = this.rows[i];
        if (el === undefined) return;
        destroyElement(el);
        el.remove();
        this.pool.push(el);
        this.rows[i] = undefined;
    }
}`;

const USAGE_SOURCE = html`<div virtual-scroll="row, i of items; 36">
    <div class="row">
        <span>{{i}}</span>
        <span>{{row.name}}</span>
        <span>{{row.role}}</span>
        <span>{{row.status}}</span>
    </div>
</div>`;

@Component({
    selector: 'hooks-section',
    directives: [TocSection, TocAnchor],
    template: `
        <section class="host" toc-section="directives/hooks">
            <h2 toc-anchor="directives/hooks">Advanced: hooks</h2>
            <p class="note">Hooks let directives extend the framework's binding and
               DOM lifecycle without patching core code. Three types exist, each
               registered at <strong>module level</strong> (not inside
               <code class="inline">onInit</code>):</p>
            <ul class="hook-list">
                <li><strong>Mutation hooks</strong> let a directive manage its own
                    children. A virtual scroll needs to recycle DOM nodes and
                    control when bindings are wired up or torn down — the mutation
                    hook hands that responsibility to the directive instead of the
                    framework's default path.</li>
                <li><strong>Scope hooks</strong> introduce new names into the
                    binding system. When a user writes
                    <code class="inline">${escape`{{row.name}}`}</code> inside a directive's
                    content, the scope hook tells the framework where
                    <code class="inline">row</code> comes from — a per-item
                    BehaviorSubject the directive owns.</li>
                <li><strong>Binding hooks</strong> let a directive modify how
                    subscriptions behave on its elements. Useful when cloned
                    elements already have the right initial state and the
                    first observable emission would be a redundant DOM write.</li>
            </ul>

            <section class="host" toc-section="directives/hooks/example">
                <h3 toc-anchor="directives/hooks/example">Example: virtual scroll</h3>
                <p class="note">A virtual scroll directive that reuses the
                   <code class="inline">rx-for</code> expression grammar
                   (<code class="inline">parseRxFor</code>) and the binding
                   system (<code class="inline">subscribeToBinding</code>),
                   but renders only the visible window. It registers a mutation
                   hook for element recycling and a scope hook for loop
                   variables.</p>
            </section>

            <section class="host" toc-section="directives/hooks/grammar">
                <h3 toc-anchor="directives/hooks/grammar">Reusing the grammar</h3>
                <p class="note">The expression is split on
                   <code class="inline">;</code>. The left side is an
                   <code class="inline">rx-for</code> expression parsed by the
                   exported <code class="inline">parseRxFor</code>. The right
                   side is the row height in pixels.</p>
                <code-block syntax="ts">${escape`${GRAMMAR_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="directives/hooks/mutation">
                <h3 toc-anchor="directives/hooks/mutation">Mutation hook</h3>
                <p class="note">The mutation hook claims the scroll container so
                   the framework's default init/destroy path is bypassed. The
                   handler is a no-op — the directive calls
                   <code class="inline">initElement</code> and
                   <code class="inline">destroyElement</code> synchronously in
                   its own <code class="inline">stamp</code> and
                   <code class="inline">recycle</code> methods, which avoids a
                   flash between append and first paint.</p>
                <code-block syntax="ts">${escape`${MUTATION_HOOK_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="directives/hooks/scope">
                <h3 toc-anchor="directives/hooks/scope">Scope hook</h3>
                <p class="note">The scope hook introduces loop variables into the
                   binding system. When a binding inside the scroll container
                   starts with the item or index name, the hook returns a
                   per-row BehaviorSubject. The binding system resolves remaining
                   segments as property access on the emitted value.</p>
                <code-block syntax="ts">${escape`${SCOPE_HOOK_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="directives/hooks/full">
                <h3 toc-anchor="directives/hooks/full">Putting it together</h3>
                <p class="note">Here is the complete directive. The module-level
                   hook registrations run once on import. The directive class
                   handles the scroll viewport, element stamping and recycling,
                   and per-row BehaviorSubject management. Everything plugs into
                   the existing binding system with no changes to core.</p>
                <code-block syntax="ts">${escape`${FULL_SOURCE}`}</code-block>
            </section>

            <section class="host" toc-section="directives/hooks/usage">
                <h3 toc-anchor="directives/hooks/usage">Usage</h3>
                <p class="note">The user writes their row markup inside the
                   directive's element. The directive captures it as a template,
                   clones it for visible rows, and recycles it on scroll. Bindings
                   inside the content resolve through the scope hook.</p>
                <code-block syntax="html">${escape`${USAGE_SOURCE}`}</code-block>
                <section class="ex">
                    <h3>In action</h3>
                    <p class="note">1,000 rows, 36px each. Only the visible window
                       plus a small buffer exists in the DOM. Scroll to verify.</p>
                    <div class="split">
                        <code-block syntax="html">${escape`<virtual-scroll-demo></virtual-scroll-demo>`}</code-block>
                        <div class="live"><virtual-scroll-demo></virtual-scroll-demo></div>
                    </div>
                </section>
            </section>
        </section>
    `,
    styles: `
        :host { display: block; }
        .hook-list { padding-left: 1.2rem; margin: 0.75rem 0; }
        .hook-list li { color: var(--text); font-size: 0.85rem; padding: 0.3rem 0; }
        .hook-list strong { color: var(--accent); }
        .live { display: block; width: 100%; padding: 0.5rem 0; }
    `,
})
export class HooksSection extends DocSection {}
