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
import { asyncScheduler, BehaviorSubject, share, skip, Subject, throttleTime } from 'rxjs';
import { Injectable, state } from 'yaw';

const SNAP_DELAY = 400;

export interface TocEntry {
    readonly id: string;
    readonly label: string;
    readonly depth: number;
    readonly childEntries: TocEntry[];
}

interface SectionRatioState {
    viewableArea: number;
    isIntersecting: boolean;
}

@Injectable()
export class TocService {
    @state activeId = '';
    @state expandAll = false;
    @state tree: readonly TocEntry[] = [];
    readonly paths = new Map<string, readonly string[]>();

    private readonly entries: { id: string; label: string; depth: number; path: string }[] = [];
    private readonly elements = new Map<string, HTMLElement>();
    private readonly idToPath = new Map<string, string>();
    private readonly pathToId = new Map<string, string>();
    private observers: Record<string, IntersectionObserver> = {};
    private ratioState: Record<string, SectionRatioState> = {};
    private ratioSubject: BehaviorSubject<Record<string, SectionRatioState>> | undefined;
    private lastAreaState: Record<string, number> = {};
    private lastWinner = '';
    private rebuildSubject = new Subject<void>();
    private ratioSubscription: { unsubscribe(): void } | undefined;
    private basePath: string | undefined;
    private restored = false;

    constructor() {
        const rebuild$ = this.rebuildSubject.pipe(
            throttleTime(100, asyncScheduler, { trailing: true, leading: false }),
            share(),
        );

        rebuild$.subscribe(() => {
            this.rebuildTree();
            this.buildObservers();
            this.restoreFromUrl();
        });


        this.activeId$.pipe(skip(1)).subscribe((id) => {
            if (!id || this.basePath === undefined) return;
            const loc = window.location.pathname;
            if (loc !== this.basePath && !loc.startsWith(this.basePath + '/')) return;
            const path = this.idToPath.get(id) ?? id;
            history.replaceState(null, '', this.basePath + '/' + path);
        });
    }

    private restoreFromUrl(): void {
        if (this.restored) return;
        this.restored = true;
        const full = window.location.pathname;
        for (const [tocPath, id] of this.pathToId) {
            if (!full.endsWith('/' + tocPath)) continue;
            const prefix = full.slice(0, full.length - tocPath.length - 1);
            if (!prefix.startsWith('/')) continue;
            this.basePath = prefix;
            this.scrollTo(id);
            return;
        }
        this.basePath = full;
    }

    registerSection(path: string, depth: number): void {
        const id = path.replace(/\//g, '-');
        const label = path.split('/').pop()!;
        this.entries.push({ id, label, depth, path });
        if (path) {
            this.idToPath.set(id, path);
            this.pathToId.set(path, id);
        }
        this.scheduleRebuild();
    }

    unregisterSection(path: string): void {
        const id = path.replace(/\//g, '-');
        this.elements.delete(id);
        this.idToPath.delete(id);
        this.pathToId.delete(path);
        const idx = this.entries.findIndex((e) => e.path === path);
        if (idx !== -1) this.entries.splice(idx, 1);
        this.disconnectObservers();
        this.scheduleRebuild();
    }

    registerAnchor(path: string, label: string, element: HTMLElement): void {
        const id = path.replace(/\//g, '-');
        this.elements.set(id, element);
        const entry = this.entries.find((e) => e.path === path);
        if (entry) entry.label = label;
        this.scheduleRebuild();
    }

    unregisterAnchor(path: string): void {
        const id = path.replace(/\//g, '-');
        this.elements.delete(id);
        this.disconnectObservers();
        this.scheduleRebuild();
    }

    scrollTo(id: string): void {
        const el = this.elements.get(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }), SNAP_DELAY);
    }

    private scheduleRebuild(): void {
        this.rebuildSubject.next();
    }

    pause(): void {
        this.disconnectObservers();
    }

    resume(): void {
        this.buildObservers();
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
                if (winner !== this.activeId) {
                    this.activeId = winner;
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
        this.paths.clear();

        const nodesByPath = new Map<string, TocEntry>();

        for (const { id, label, depth, path } of this.entries) {
            const entry: TocEntry = { id, label, depth, childEntries: [] };
            nodesByPath.set(path, entry);

            const lastSlash = path.lastIndexOf('/');
            const parentPath = lastSlash === -1 ? null : path.slice(0, lastSlash);
            const parent = parentPath !== null ? nodesByPath.get(parentPath) : undefined;

            if (parent) {
                parent.childEntries.push(entry);
            } else {
                root.push(entry);
            }

            const trail: string[] = [];
            let cur: string | null = path;
            while (cur !== null) {
                const cid = cur.replace(/\//g, '-');
                trail.unshift(cid);
                const s = cur.lastIndexOf('/');
                cur = s === -1 ? null : cur.slice(0, s);
            }
            this.paths.set(id, trail);
        }
        this.tree = root;
    }
}
