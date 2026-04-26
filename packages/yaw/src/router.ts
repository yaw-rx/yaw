import { BehaviorSubject } from 'rxjs';
import type { Route } from './component.js';
import { Injectable } from './di/injectable.js';

export const ROUTES = Symbol('ROUTES');

@Injectable([ROUTES])
export class Router {
    readonly route$ = new BehaviorSubject<string>(window.location.pathname);

    constructor(private readonly routes: readonly Route[]) {
        window.addEventListener('popstate', () => {
            this.route$.next(window.location.pathname);
        });
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
        const wildcard = this.routes.find((r) => r.path === '*');
        return wildcard?.load?.();
    }
}
