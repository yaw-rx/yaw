/**
 * toc.ts — table of contents service for the docs page.
 *
 * Single source of truth for docs navigation. Content sections register
 * themselves via the toc-section directive; the service builds a tree
 * and tracks which section is active.
 *
 * Algorithm — center-line intersection:
 *
 * 1. Sections register their body element via the toc-section directive.
 *
 * 2. Each body gets an IntersectionObserver with rootMargin
 *    '-50% 0px -50% 0px'. This shrinks the observation zone to a
 *    zero-height line at the viewport's vertical center.
 *
 * 3. When a body crosses that center line the observer fires an enter
 *    event and that body becomes the active section.
 *
 * 4. Only enter events are used. The last body to enter the center
 *    line wins. Sections taller than the viewport remain active for
 *    the entire duration they span the midpoint.
 */
import { asyncScheduler, type Subscription, share, skip, Subject, throttleTime } from 'rxjs';
import { Injectable, state } from '@yaw-rx/core';
import { getGlobalSSGState, setGlobalSSGState } from '@yaw-rx/core/hydrate/global-blob';
import { isSSGCapture } from '@yaw-rx/core/hydrate/state';
import { Router } from '@yaw-rx/core/router';

export interface TocEntry {
    readonly id: string;
    readonly label: string;
    readonly depth: number;
    readonly childEntries: TocEntry[];
}


@Injectable([Router])
export class TocMenuItemsService {
    @state activeId = '';
    @state expandAll = false;
    @state tree: readonly TocEntry[] = [];
    readonly paths = new Map<string, readonly string[]>();

    private readonly router: Router;
    private readonly entries: { id: string; label: string; depth: number; path: string }[] = [];
    private readonly anchorElements = new Map<string, HTMLElement>();
    private readonly bodies: { id: string; element: HTMLElement; depth: number }[] = [];
    private readonly idToPath = new Map<string, string>();
    private readonly pathToId = new Map<string, string>();
    private bodyObservers: Record<string, IntersectionObserver> = {};
    private rebuildSubject = new Subject<void>();
    private basePath: string | undefined;
    private restored = false;
    private readonly subs: Subscription[] = [];
    // First-writer-wins between SSG global blob chunks and rebuildTree.
    // Both set tree/paths; whichever fires first claims authority and
    // the other is suppressed to avoid redundant emissions on tree$.
    private treeFromBlob = false;
    private treeFromRebuild = false;

    private blobSubs: Subscription[] = [];

    constructor(router: Router) {
        this.router = router;

        this.subscribeToBlob(router.route$.getValue());

        const rebuild$ = this.rebuildSubject.pipe(
            throttleTime(100, asyncScheduler, { trailing: true, leading: false }),
            share(),
        );

        this.subs.push(
            rebuild$.subscribe(() => {
                this.rebuildTree();
                this.buildObservers();
                this.restoreFromUrl();
            }),
            this.activeId$.pipe(skip(1)).subscribe((id) => {
                if (!id || this.basePath === undefined) return;
                const loc = window.location.pathname;
                if (loc !== this.basePath && !loc.startsWith(this.basePath + '/')) return;
                const path = this.idToPath.get(id) ?? id;
                history.replaceState(null, '', this.basePath + '/' + path);
            }),
        );
    }

    private subscribeToBlob(route: string): void {
        this.blobSubs = [
            getGlobalSSGState(route, 'toc-tree').subscribe((value) => {
                if (this.treeFromRebuild) return;
                this.tree = value as unknown as TocEntry[];
                this.treeFromBlob = true;
            }),
            getGlobalSSGState(route, 'toc-paths').subscribe((value) => {
                if (this.treeFromRebuild) return;
                const paths = value as unknown as Record<string, string[]>;
                for (const [id, trail] of Object.entries(paths)) {
                    this.paths.set(id, trail);
                }
            }),
        ];
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
            console.log('restoreFromUrl → scrollTo:', id, 'path:', tocPath);
            this.scrollTo(id);
            return;
        }
        this.basePath = full;
    }

    registerSection(path: string, depth: number, element: HTMLElement): void {
        const id = path.replace(/\//g, '-');
        const label = path.split('/').pop()!;
        this.entries.push({ id, label, depth, path });
        this.bodies.push({ id, element, depth });
        if (path) {
            this.idToPath.set(id, path);
            this.pathToId.set(path, id);
        }
        this.scheduleRebuild();
    }

    unregisterSection(path: string): void {
        const id = path.replace(/\//g, '-');
        this.anchorElements.delete(id);
        const bodyIdx = this.bodies.findIndex((b) => b.id === id);
        if (bodyIdx !== -1) this.bodies.splice(bodyIdx, 1);
        this.idToPath.delete(id);
        this.pathToId.delete(path);
        const idx = this.entries.findIndex((e) => e.path === path);
        if (idx !== -1) this.entries.splice(idx, 1);
        this.disconnectObservers();
        this.scheduleRebuild();
    }

    registerAnchor(path: string, label: string, element: HTMLElement): void {
        const id = path.replace(/\//g, '-');
        this.anchorElements.set(id, element);
        const entry = this.entries.find((e) => e.path === path);
        if (entry) entry.label = label;
        this.scheduleRebuild();
    }

    unregisterAnchor(path: string): void {
        const id = path.replace(/\//g, '-');
        this.anchorElements.delete(id);
        this.disconnectObservers();
        this.scheduleRebuild();
    }

    scrollTo(id: string): void {
        const el = this.anchorElements.get(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth' });
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
        for (const id of Object.keys(this.bodyObservers)) {
            this.bodyObservers[id]!.disconnect();
        }
        this.bodyObservers = {};
    }

    private buildObservers(): void {
        this.disconnectObservers();

        for (let i = 0; i < this.bodies.length; i++) {
            const { id, element } = this.bodies[i]!;

            const observer = new IntersectionObserver(
                (entries) => {
                    const entry = entries[0];
                    if (!entry) return;

                    if (entry.isIntersecting) {
                        if (id !== this.activeId) {
                            this.activeId = id;
                        }
                    }
                },
                { rootMargin: '-50% 0px -50% 0px' },
            );
            observer.observe(element);
            this.bodyObservers[id] = observer;
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
        // SSG blob chunk already provided the authoritative tree for this
        // route - skip assignment to avoid a redundant emission on tree$.
        if (this.treeFromBlob) return;
        // Claim authority so a late-arriving blob chunk is suppressed.
        this.treeFromRebuild = true;
        this.tree = root;
        // Only capture into the global SSG state during SSG - at runtime
        // the blob chunks own this data and would collide.
        if (isSSGCapture()) {
            const route = this.router.route$.getValue();
            const pathsRecord: Record<string, readonly string[]> = {};
            for (const [id, trail] of this.paths) pathsRecord[id] = trail;
            setGlobalSSGState(route, 'toc-tree', root);
            setGlobalSSGState(route, 'toc-paths', pathsRecord);
        }
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        for (const sub of this.blobSubs) sub.unsubscribe();
        this.disconnectObservers();
    }
}
