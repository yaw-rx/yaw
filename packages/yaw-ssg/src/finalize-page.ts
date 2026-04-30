import type { Page } from 'puppeteer-core';

/**
 * Runs SSG finalization inside a Puppeteer page context.
 *
 * Serializes all component and service state into a JSON blob, flattens
 * adoptedStyleSheets into a style tag, and embeds the route list.
 * Reads framework internals from globalThis.__yaw_ssg_internals, which
 * the framework populates during bootstrap in SSG mode.
 */
export async function finalizePage(page: Page): Promise<void> {
    await page.evaluate(() => {
        const internals = (globalThis as Record<string, unknown>)['__yaw_ssg_internals'] as {
            getObservableKeys: (proto: object) => ReadonlySet<string>;
            isObservable: (obj: unknown) => boolean;
            encodeAttribute: (typeName: string, key: string, value: unknown) => string;
            Injector: { new (...args: unknown[]): { forEachInstance: (cb: (instance: unknown) => void) => void } };
        };

        const { getObservableKeys, isObservable, encodeAttribute } = internals;

        const unwrapObservables = (value: unknown): unknown => {
            if (isObservable(value)) {
                let sync: unknown;
                (value as { subscribe: (fn: (v: unknown) => void) => { unsubscribe: () => void } })
                    .subscribe(v => { sync = v; }).unsubscribe();
                return unwrapObservables(sync);
            }
            if (Array.isArray(value)) return value.map(unwrapObservables);
            if (value !== null && typeof value === 'object' && value.constructor === Object) {
                const out: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(value)) out[k] = unwrapObservables(v);
                return out;
            }
            return value;
        };

        const blob: { components: Record<string, Record<string, unknown>>; services: Record<string, Record<string, unknown>>; directives: Record<string, unknown> } = {
            components: {}, services: {}, directives: {},
        };
        let nextId = 0;

        for (const el of document.querySelectorAll('[data-rx-host]')) {
            const keys = getObservableKeys(Object.getPrototypeOf(el));
            if (keys.size === 0) continue;
            const id = String(nextId++);
            el.setAttribute('data-ssg-id', id);
            const typeMap = (el.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
            const state: Record<string, unknown> = {};
            for (const key of keys) {
                const value = (el as unknown as Record<string, unknown>)[key];
                const typeName = typeMap?.[key];
                const unwrapped = unwrapObservables(value);
                state[key] = typeName !== undefined ? encodeAttribute(typeName, key, unwrapped) : unwrapped;
            }
            blob.components[id] = state;
        }

        const seen = new Set<object>();
        const collectServices = (injector: { forEachInstance: (cb: (instance: unknown) => void) => void }): void => {
            injector.forEachInstance((instance: unknown) => {
                if (instance instanceof HTMLElement) return;
                if (seen.has(instance as object)) return;
                seen.add(instance as object);
                const keys = getObservableKeys(Object.getPrototypeOf(instance));
                if (keys.size === 0) return;
                const ctor = (instance as object).constructor;
                const name = ctor.name;
                const typeMap = (ctor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
                const svc: Record<string, unknown> = {};
                for (const key of keys) {
                    const unwrapped = unwrapObservables((instance as Record<string, unknown>)[key]);
                    const typeName = typeMap?.[key];
                    svc[key] = typeName !== undefined ? encodeAttribute(typeName, key, unwrapped) : unwrapped;
                }
                blob.services[name] = svc;
            });
        };

        const body = document.body as unknown as Record<string, unknown>;
        const rootInjector = body['__injector'] as { forEachInstance: (cb: (instance: unknown) => void) => void } | undefined;
        if (rootInjector !== undefined) collectServices(rootInjector);
        for (const el of document.querySelectorAll('[data-rx-host]')) {
            const injector = (el as unknown as Record<string, unknown>)['__injector'] as { forEachInstance: (cb: (instance: unknown) => void) => void } | undefined;
            if (injector !== undefined) collectServices(injector);
        }

        // flatten adoptedStyleSheets
        const css: string[] = [];
        for (const sheet of document.adoptedStyleSheets) {
            for (const rule of sheet.cssRules) {
                css.push(rule.cssText);
            }
        }
        if (css.length > 0) {
            const style = document.createElement('style');
            style.id = 'yaw-ssg-styles';
            style.textContent = css.join('\n');
            document.head.appendChild(style);
        }

        // embed state blob
        const stateEl = document.createElement('script');
        stateEl.type = 'application/json';
        stateEl.id = 'yaw-ssg-state';
        stateEl.textContent = JSON.stringify(blob);
        document.head.appendChild(stateEl);

        // embed route list
        const routeSource = (globalThis as Record<string, unknown>)['__yaw_ssg_route_source'] as (() => readonly string[]) | undefined;
        if (routeSource !== undefined) {
            const el = document.createElement('script');
            el.type = 'application/json';
            el.id = 'yaw-ssg-routes';
            el.textContent = JSON.stringify(routeSource());
            document.head.appendChild(el);
        }

        document.body.setAttribute('data-ssg-ready', '');
    });
}
