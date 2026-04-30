import { BehaviorSubject } from 'rxjs';
import type { Route } from './component.js';
import { isSSG } from './component.js';
import { Injectable } from './di/injectable.js';

export const ROUTES = Symbol('ROUTES');

@Injectable([ROUTES])
export class Router {
    readonly route$: BehaviorSubject<string>;
    private readonly routePattern: RegExp;

    constructor(private readonly routes: readonly Route[]) {
        const paths = routes.map((r) => r.path).filter((p) => p !== '*').sort((a, b) => b.length - a.length);
        this.routePattern = new RegExp('^(' + paths.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?=/|$)');
        this.route$ = new BehaviorSubject<string>(this.matchRoute(window.location.pathname));
        window.addEventListener('popstate', () => {
            this.route$.next(this.matchRoute(window.location.pathname));
        });
        if (isSSG()) (globalThis as Record<string, unknown>)['__yaw_ssg_route_source'] = () => this.paths;
    }

    private matchRoute(path: string): string {
        return this.routePattern.exec(path)?.[1] ?? path;
    }

    get paths(): readonly string[] {
        return this.routes.filter((r) => r.path !== '*' && r.redirect === undefined).map((r) => r.path);
    }

    navigate(path: string): void {
        window.history.pushState(null, '', path);
        this.route$.next(path);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

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
