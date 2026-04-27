import { getSelector, isSSG } from './component.js';
import { getObservableKeys } from './observable.js';
import { encodeAttribute } from './attribute-codec/encode.js';

export interface SSGNode {
    readonly selector: string;
    readonly children: SSGNode[];
}

let root: SSGNode | undefined;
let current: SSGNode | undefined;
const parentStack: SSGNode[] = [];
const nodeByElement = new WeakMap<Element, SSGNode>();

export const getSSGRoot = (): SSGNode | undefined => root;

export const ssgEnter = (ctor: Function, el?: Element): boolean => {
    if (!isSSG()) return false;
    const selector = getSelector(ctor);
    if (selector === undefined) return false;
    const node: SSGNode = { selector, children: [] };
    if (current !== undefined) { (current.children as SSGNode[]).push(node); }
    else { root = node; }
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

export const serializeState = (): void => {
    for (const el of document.querySelectorAll('[data-rx-host]')) {
        const keys = getObservableKeys(Object.getPrototypeOf(el));
        if (keys.size === 0) continue;
        const typeMap = (el.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
        const state: Record<string, unknown> = {};
        for (const key of keys) {
            const value = (el as unknown as Record<string, unknown>)[key];
            const typeName = typeMap?.[key];
            state[key] = typeName !== undefined ? encodeAttribute(typeName, key, value) : value;
        }
        el.setAttribute('data-rx-state', JSON.stringify(state));
    }
};

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
    serializeState();
    flattenStyles();

    if (root !== undefined) {
        const el = document.createElement('script');
        el.type = 'application/json';
        el.id = 'yaw-ssg-deps';
        el.textContent = JSON.stringify(root);
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
