import { setupBindings } from './setupBindings.js';
import { setupDirectivesFor, isHydrating } from './rx-element.js';
import type { Directive } from './directive.js';

const hasBinding = (el: Element): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('data-rx-bind-')) return true;
    }
    return false;
};

const hasDirective = (el: Element): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('rx-')) return true;
    }
    return false;
};

const isNative = (el: Element): boolean => !el.tagName.includes('-');

const pending: Element[] = [];
const teardowns = new WeakMap<Element, () => void>();
const directiveInstances = new WeakMap<Element, Directive[]>();

const init = (el: Element): void => {
    if (teardowns.has(el)) return;
    const directives = setupDirectivesFor(el);
    if (directives.length > 0) directiveInstances.set(el, directives);
    teardowns.set(el, setupBindings(el as HTMLElement));
};

const destroy = (el: Element): void => {
    const td = teardowns.get(el);
    if (td !== undefined) { td(); teardowns.delete(el); }
    const dirs = directiveInstances.get(el);
    if (dirs !== undefined) {
        for (const d of dirs) d.onDestroy();
        directiveInstances.delete(el);
    }
};

const processAdded = (el: Element): void => {
    if (!el.isConnected) return;
    if (isNative(el) && (hasBinding(el) || hasDirective(el))) {
        if (isHydrating()) { pending.push(el); } else { init(el); }
    }
    let child = el.firstElementChild;
    while (child !== null) {
        if (isNative(child)) processAdded(child);
        child = child.nextElementSibling;
    }
};

const processRemoved = (el: Element): void => {
    if (isNative(el)) destroy(el);
    let child = el.firstElementChild;
    while (child !== null) {
        if (isNative(child)) processRemoved(child);
        child = child.nextElementSibling;
    }
};

const observer = new MutationObserver((records) => {
    for (const record of records) {
        for (const node of record.removedNodes) {
            if (node.nodeType === 1) processRemoved(node as Element);
        }
        for (const node of record.addedNodes) {
            if (node.nodeType === 1) processAdded(node as Element);
        }
    }
});

export const startNativeObserver = (): void => {
    observer.observe(document.body, { childList: true, subtree: true });
};

export const flushNativeBindings = (): void => {
    for (const el of pending) init(el);
    pending.length = 0;
};
