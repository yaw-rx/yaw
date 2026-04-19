import 'reflect-metadata';
import { BehaviorSubject } from 'rxjs';
import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';

const TOP_OFFSET = 80;

@Injectable()
export class TocService {
    readonly activeId$ = new BehaviorSubject<string>('');
    private readonly registry = new Map<string, HTMLElement>();
    private observer: IntersectionObserver | undefined;

    register(id: string, header: HTMLElement): void {
        this.registry.set(id, header);
        this.getObserver().observe(header);
        this.recompute();
    }

    unregister(id: string): void {
        const el = this.registry.get(id);
        if (el) this.getObserver().unobserve(el);
        this.registry.delete(id);
    }

    scrollTo(id: string): void {
        const el = this.registry.get(id);
        if (!el) return;
        const y = window.scrollY + el.getBoundingClientRect().top - TOP_OFFSET;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }

    private recompute(): void {
        const vh = window.innerHeight;
        const items = [...this.registry.entries()]
            .map(([id, el]) => ({ id, top: el.getBoundingClientRect().top }))
            .sort((a, b) => a.top - b.top);
        if (items.length === 0) return;
        let activeId = items[0]!.id;
        for (const item of items) {
            if (item.top < vh) activeId = item.id;
            else break;
        }
        if (activeId !== this.activeId$.value) this.activeId$.next(activeId);
    }

    private getObserver(): IntersectionObserver {
        if (this.observer) return this.observer;
        this.observer = new IntersectionObserver(() => { this.recompute(); });
        return this.observer;
    }
}

@Directive({ selector: '[toc-section]' })
@Injectable([TocService])
export class TocSection {
    host!: RxElementLike;
    private readonly toc: TocService;
    private id: string | undefined;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { host } = this;
        const header = host.querySelector('h1, h2') as HTMLElement | null;
        const tracked: HTMLElement = header ?? host;
        tracked.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;
        this.id = host.id;
        if (!this.id) {
            return;
        }
        this.toc.register(this.id, tracked);
    }

    onDestroy(): void {
        if (this.id) {
            this.toc.unregister(this.id);
        }
    }
}
