import { isObservable } from 'rxjs';
import { getSelector, isSSG } from './component.js';
import { getObservableKeys } from './observable.js';
import { encodeAttribute } from './attribute-codec/encode.js';
import type { RxElementLike } from './directive.js';
import { Injector } from './di/injector.js';
export { holdReady, releaseReady } from './rx-element.js';

export interface SSGNode {
    readonly selector: string;
    readonly children: SSGNode[];
}

const roots: SSGNode[] = [];
let current: SSGNode | undefined;
const parentStack: SSGNode[] = [];
const nodeByElement = new WeakMap<Element, SSGNode>();

export const getSSGRoot = (): SSGNode | undefined =>
    roots.length === 1 ? roots[0] : roots.length > 1 ? { selector: '', children: roots } : undefined;

export const ssgEnter = (ctor: Function, el?: Element): boolean => {
    if (!isSSG()) return false;
    const selector = getSelector(ctor);
    if (selector === undefined) return false;
    const node: SSGNode = { selector, children: [] };
    if (current !== undefined) { (current.children as SSGNode[]).push(node); }
    else { roots.push(node); }
    parentStack.push(node);
    current = node;
    if (el !== undefined) nodeByElement.set(el, node);
    return true;
};

export const ssgLeave = (): void => {
    if (!isSSG()) return;
    parentStack.pop();
    current = parentStack.length > 0 ? parentStack[parentStack.length - 1] : undefined;
};

export const ssgScope = (el: Element): void => {
    if (!isSSG()) return;
    const node = nodeByElement.get(el);
    if (node === undefined) return;
    parentStack.push(node);
    current = node;
};

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
        console.log('[ssg] component', el.tagName, 'typeMap', typeMap, 'keys', [...keys]);
        const state: Record<string, unknown> = {};
        for (const key of keys) {
            const value = (el as unknown as Record<string, unknown>)[key];
            const typeName = typeMap?.[key];
            const unwrapped = unwrapObservables(value);
            console.log('[ssg]  field', key, 'typeName', typeName, 'type', typeof unwrapped, unwrapped?.constructor?.name);
            state[key] = typeName !== undefined ? encodeAttribute(typeName, key, unwrapped) : unwrapped;
        }
        blob.components[id] = state;
    }
    console.log('[ssg] components done');

    const seen = new Set<object>();
    const collectServices = (injector: Injector): void => {
        injector.forEachInstance((instance: unknown) => {
            if (instance instanceof HTMLElement) return;
            if (seen.has(instance as object)) return;
            seen.add(instance as object);
            const keys = getObservableKeys(Object.getPrototypeOf(instance));
            if (keys.size === 0) return;
            const name = (instance as object).constructor.name;
            console.log('[ssg] service', name, 'keys', [...keys]);
            const svc: Record<string, unknown> = {};
            for (const key of keys) {
                svc[key] = unwrapObservables((instance as Record<string, unknown>)[key]);
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
    console.log('[ssg] ssgFinalize running');
    const blob = serializeState();
    for (const [name, state] of Object.entries(blob.services)) {
        const t = state['tree'];
        console.log('[ssg] service', name, Object.keys(state), Array.isArray(t) ? `tree:${t.length}` : '');
    }
    flattenStyles();

    const stateEl = document.createElement('script');
    stateEl.type = 'application/json';
    stateEl.id = 'yaw-ssg-state';
    stateEl.textContent = JSON.stringify(blob);
    document.head.appendChild(stateEl);

    const ssgRoot = getSSGRoot();
    if (ssgRoot !== undefined) {
        const el = document.createElement('script');
        el.type = 'application/json';
        el.id = 'yaw-ssg-deps';
        el.textContent = JSON.stringify(ssgRoot);
        document.head.appendChild(el);
    }

    if (routeSource !== undefined) {
        const el = document.createElement('script');
        el.type = 'application/json';
        el.id = 'yaw-ssg-routes';
        el.textContent = JSON.stringify(routeSource());
        document.head.appendChild(el);
    }

    document.body.setAttribute('data-ssg-ready', '');
};
