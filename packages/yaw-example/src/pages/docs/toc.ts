/**
 * toc.ts — table of contents service and directive for the docs page.
 *
 * The TocService is the single source of truth for the docs navigation.
 * Content sections register themselves via the toc-section directive.
 * The service builds a tree and tracks which section is most visible.
 *
 * Adapted from jk89/personal-website NavigationService. The approach:
 *
 * 1. Sections register with their element reference (like Angular's
 *    linkElementToNavigation directive).
 *
 * 2. After all sections register (batched via microtask), the service
 *    builds intersection observers for ALL sections at once — not one
 *    by one. Each observer uses thresholds [0, 0.25, 0.5, 0.75, 1].
 *
 * 3. Observer callbacks merge their ratio into a shared state object
 *    and push to a single BehaviorSubject. One subscription on that
 *    subject computes the winner — highest viewable area. State
 *    diffing prevents redundant updates.
 *
 * 4. Click navigation: smooth scroll + hard snap after a delay
 *    (smooth scrollIntoView is buggy during page load on some clients).
 */
import 'reflect-metadata';
import { asyncScheduler, BehaviorSubject, Subject, throttleTime } from 'rxjs';
import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';

const TOP_OFFSET = 80;
const SNAP_DELAY = 700;

export interface TocEntry {
    readonly id: string;
    readonly label: string;
    readonly depth: number;
    readonly children: TocEntry[];
}

interface SectionRatioState {
    viewableArea: number;
    isIntersecting: boolean;
}

@Injectable()
export class TocService {
    readonly activeId$ = new BehaviorSubject<string>('');
    readonly tree$ = new BehaviorSubject<readonly TocEntry[]>([]);
    readonly paths = new Map<string, readonly string[]>();

    private readonly entries: { id: string; label: string; depth: number }[] = [];
    private readonly elements = new Map<string, HTMLElement>();
    private observers: Record<string, IntersectionObserver> = {};
    private ratioState: Record<string, SectionRatioState> = {};
    private ratioSubject: BehaviorSubject<Record<string, SectionRatioState>> | undefined;
    private lastAreaState: Record<string, number> = {};
    private lastWinner = '';
    private rebuildPending = false;
    private rebuildSubject = new Subject<void>();
    private ratioSubscription: { unsubscribe(): void } | undefined;

    constructor() {
        this.rebuildSubject
            .pipe(throttleTime(100, asyncScheduler, { trailing: true, leading: false }))
            .subscribe(() => {
                this.rebuildTree();
                this.buildObservers();
            });
    }

    register(id: string, label: string, depth: number, element: HTMLElement): void {
        this.elements.set(id, element);
        this.entries.push({ id, label, depth });
        this.scheduleRebuild();
    }

    unregister(id: string): void {
        this.elements.delete(id);
        const idx = this.entries.findIndex((e) => e.id === id);
        if (idx !== -1) this.entries.splice(idx, 1);
        this.disconnectObservers();
        this.scheduleRebuild();
    }

    scrollTo(id: string): void {
        const el = this.elements.get(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => el.scrollIntoView(true), SNAP_DELAY);
    }

    private scheduleRebuild(): void {
        this.rebuildSubject.next();
    }

    private disconnectObservers(): void {
        for (const id of Object.keys(this.observers)) {
            this.observers[id]!.disconnect();
        }
        this.observers = {};
    }

    private buildObservers(): void {
        this.ratioSubscription?.unsubscribe();
        this.disconnectObservers();

        this.ratioState = {};
        this.lastAreaState = {};
        this.lastWinner = '';

        this.ratioSubject = new BehaviorSubject<Record<string, SectionRatioState>>(this.ratioState);

        this.ratioSubscription = this.ratioSubject.subscribe((state) => {
            const currentArea: Record<string, number> = {};
            for (const id of Object.keys(state)) {
                currentArea[id] = state[id]!.viewableArea;
            }

            const diff: Record<string, boolean> = {};
            for (const id of Object.keys(currentArea)) {
                if (currentArea[id] !== this.lastAreaState[id]) diff[id] = true;
            }
            const stateChanged = Object.keys(diff).length > 0;
            if (!stateChanged) return;

            let maxRatio = 0;
            let winner = '';

            for (const id of Object.keys(currentArea)) {
                const ratio = currentArea[id]!;
                if (ratio > maxRatio && stateChanged) {
                    maxRatio = ratio;
                    winner = id;
                } else if (ratio === maxRatio && ratio > 0) {
                    if (id !== this.lastWinner && stateChanged && diff[id]) {
                        maxRatio = ratio;
                        winner = id;
                    }
                }
            }

            if (winner && (diff[winner] || diff[this.lastWinner])) {
                this.lastWinner = winner;
                this.lastAreaState = currentArea;
                if (winner !== this.activeId$.value) {
                    this.activeId$.next(winner);
                }
            }
        });

        for (const [id, element] of this.elements) {
            this.ratioState[id] = { viewableArea: 0, isIntersecting: false };

            const observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    if (!entry) return;
                    this.ratioState[id] = {
                        viewableArea: entry.intersectionRatio,
                        isIntersecting: entry.isIntersecting,
                    };
                    this.ratioSubject!.next(this.ratioState);
                },
                { rootMargin: '0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
            );

            observer.observe(element);
            this.observers[id] = observer;
        }
    }

    private rebuildTree(): void {
        const root: TocEntry[] = [];
        const stack: TocEntry[] = [];
        this.paths.clear();

        for (const { id, label, depth } of this.entries) {
            const entry: TocEntry = { id, label, depth, children: [] };
            while (stack.length > 0 && stack[stack.length - 1]!.depth >= depth) {
                stack.pop();
            }
            if (stack.length === 0) {
                root.push(entry);
            } else {
                stack[stack.length - 1]!.children.push(entry);
            }
            stack.push(entry);
            this.paths.set(id, stack.map((e) => e.id));
        }

        this.tree$.next(root);
    }
}

@Directive({ selector: '[toc-section]' })
@Injectable([TocService])
export class TocSection {
    node!: RxElementLike;
    private readonly toc: TocService;
    private id: string | undefined;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;

        let depth = 0;
        let ancestor: Element | null = node.parentElement;
        while (ancestor !== null) {
            if (ancestor.hasAttribute('toc-section')) depth++;
            ancestor = ancestor.parentElement;
        }
        node.style.setProperty('--toc-depth', String(depth));

        this.id = node.id;
        if (!this.id) return;

        queueMicrotask(() => {
            const first = node.firstElementChild;
            const isHeading = first !== null && /^(rx-)?h[1-6]$/i.test(first.tagName);
            const tracked: HTMLElement = isHeading ? first as HTMLElement : node;
            tracked.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;
            const label = isHeading ? (first as HTMLElement).textContent ?? '' : '';
            this.toc.register(this.id!, label, depth, node as HTMLElement);
        });
    }

    onDestroy(): void {
        if (this.id) {
            this.toc.unregister(this.id);
        }
    }
}
