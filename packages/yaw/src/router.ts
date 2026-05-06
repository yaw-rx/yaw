import { BehaviorSubject, Subject } from 'rxjs';
import type { Route } from './component.js';
import { isSSGCapture } from './component.js';
import { Injectable } from './di/injectable.js';

/**
 * DI token for the routes array. Provide this at bootstrap with
 * a useValue containing the application's Route[] list.
 */
export const ROUTES = Symbol('ROUTES');

/**
 * Router service. Resolves the current URL to a route, lazy-loads
 * the matching page component, and exposes route$ and pageReady$ streams.
 * @property {BehaviorSubject<string>} route$ - Emits the matched route path on navigation.
 * @property {Subject<string>} pageReady$ - Emits after a page component and its subtree have initialized.
 */
@Injectable([ROUTES])
export class Router {
    readonly route$: BehaviorSubject<string>;
    readonly pageReady$ = new Subject<string>();
    private readonly routePattern: RegExp;

    /**
     * @param {readonly Route[]} routes - The application's route definitions.
     */
    constructor(private readonly routes: readonly Route[]) {
        const paths = routes.map((r) => r.path).filter((p) => p !== '*').sort((a, b) => b.length - a.length);
        this.routePattern = new RegExp('^(' + paths.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?=/|$)');
        this.route$ = new BehaviorSubject<string>(this.matchRoute(window.location.pathname));
        window.addEventListener('popstate', () => {
            this.route$.next(this.matchRoute(window.location.pathname));
        });
        if (isSSGCapture()) (globalThis as Record<string, unknown>)['__yaw_ssg_route_source'] = () => this.paths;
    }

    private matchRoute(path: string): string {
        return this.routePattern.exec(path)?.[1] ?? path;
    }

    /**
     * Returns all non-wildcard, non-redirect route paths.
     * @returns {readonly string[]} The navigable paths.
     */
    get paths(): readonly string[] {
        return this.routes.filter((r) => r.path !== '*' && r.redirect === undefined).map((r) => r.path);
    }

    /**
     * Pushes a new URL, emits the route, and scrolls to top.
     * @param {string} path - The URL path to navigate to.
     * @returns {void}
     */
    navigate(path: string): void {
        window.history.pushState(null, '', path);
        this.route$.next(path);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    /**
     * Resolves a path to its page component constructor by matching
     * against the route table. Follows redirects and falls back to
     * prefix matching, then the wildcard route.
     * @param {string} path - The URL path to resolve.
     * @returns {Promise<CustomElementConstructor | undefined>} The page constructor, or undefined if no match.
     */
    async resolve(path: string): Promise<CustomElementConstructor | undefined> {
        for (const route of this.routes) {
            if (route.redirect !== undefined && route.path === path) {
                return this.resolve(route.redirect);
            }
            if (route.load !== undefined && route.path === path) return route.load();
        }
        let best: Route | undefined;
        for (const route of this.routes) {
            if (route.load !== undefined && route.path !== '*' && path.startsWith(route.path + '/')) {
                if (best === undefined || route.path.length > best.path.length) best = route;
            }
        }
        if (best?.load !== undefined) return best.load();
        const wildcard = this.routes.find((r) => r.path === '*');
        return wildcard?.load?.();
    }
}
