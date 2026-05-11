import { fromEvent, animationFrameScheduler, BehaviorSubject, type Subscription } from 'rxjs';
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
                this.spacer.style.height = `${incoming.length * this.rowHeight}px`;
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
        this.spacer.style.height = `${count * this.rowHeight}px`;
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
        el.style.top = `${i * this.rowHeight}px`;
        el.style.left = '0';
        el.style.right = '0';
        el.style.height = `${this.rowHeight}px`;
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
}
