import { isObservable } from './is-observable.js';
import { getObservableKeys } from './observable.js';
import { encodeAttribute } from './attribute-codec/encode.js';
import type { RxElementLike } from './directive.js';
import { Injector } from './di/injector.js';

let routeSource: (() => readonly string[]) | undefined;

export const registerRouteSource = (fn: () => readonly string[]): void => { routeSource = fn; };

// ---------------------------------------------------------------------------
// SSG state blob — single JSON blob for all state (components + services)
// ---------------------------------------------------------------------------

export interface SSGStateBlob {
    components: Record<string, Record<string, unknown>>;
    services: Record<string, Record<string, unknown>>;
    directives: Record<string, unknown>;
}

const unwrapObservables = (value: unknown): unknown => {
    if (isObservable(value)) {
        let sync: unknown;
        value.subscribe(v => { sync = v; }).unsubscribe();
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

const serializeState = (): SSGStateBlob => {
    const blob: SSGStateBlob = { components: {}, services: {}, directives: {} };
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
    const collectServices = (injector: Injector): void => {
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

    const rootInjector = (document.body as RxElementLike).__injector as Injector | undefined;
    if (rootInjector !== undefined) collectServices(rootInjector);
    for (const el of document.querySelectorAll('[data-rx-host]')) {
        const injector = (el as RxElementLike).__injector as Injector | undefined;
        if (injector !== undefined) collectServices(injector);
    }

    return blob;
};

// ---------------------------------------------------------------------------
// Hydration restore — read blob from captured HTML
// ---------------------------------------------------------------------------

let hydrateBlob: SSGStateBlob | undefined;

export const loadHydrateState = (): void => {
    const el = document.getElementById('yaw-ssg-state');
    if (el === null) return;
    hydrateBlob = JSON.parse(el.textContent!) as SSGStateBlob;
};

export const getComponentHydrateState = (ssgId: string): Record<string, unknown> | undefined =>
    hydrateBlob?.components[ssgId];

export const getServiceHydrateState = (name: string): Record<string, unknown> | undefined =>
    hydrateBlob?.services[name];

export const stripSsgAttributes = (): void => {
    for (const el of document.querySelectorAll('[data-ssg-id]')) {
        el.removeAttribute('data-ssg-id');
    }
};

// ---------------------------------------------------------------------------
// Styles + finalize
// ---------------------------------------------------------------------------

let finalized = false;

const flattenStyles = (): void => {
    const css: string[] = [];
    for (const sheet of document.adoptedStyleSheets) {
        for (const rule of sheet.cssRules) {
            css.push(rule.cssText);
        }
    }
    if (css.length === 0) return;
    const style = document.createElement('style');
    style.id = 'yaw-ssg-styles';
    style.textContent = css.join('\n');
    document.head.appendChild(style);
};

export const ssgFinalize = (): void => {
    if (finalized) return;
    finalized = true;
    const blob = serializeState();
    flattenStyles();

    const stateEl = document.createElement('script');
    stateEl.type = 'application/json';
    stateEl.id = 'yaw-ssg-state';
    stateEl.textContent = JSON.stringify(blob);
    document.head.appendChild(stateEl);

    if (routeSource !== undefined) {
        const el = document.createElement('script');
        el.type = 'application/json';
        el.id = 'yaw-ssg-routes';
        el.textContent = JSON.stringify(routeSource());
        document.head.appendChild(el);
    }

    document.body.setAttribute('data-ssg-ready', '');
};
