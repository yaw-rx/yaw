import { setupBindings } from './setupBindings.js';
import { setupDirectivesFor } from './directives/setup.js';
import { RxElementBase } from './rx-element.js';
import type { Directive } from './directive.js';

const hasBinding = (el: Element): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('data-rx-bind-')) return true;
    }
    return false;
};

const teardowns = new WeakMap<Element, () => void>();
const directiveInstances = new WeakMap<Element, Directive[]>();

const initNative = (el: Element): void => {
    if (teardowns.has(el)) return;
    const directives = setupDirectivesFor(el);
    const hasBind = hasBinding(el);
    if (directives.length === 0 && !hasBind) return;
    if (directives.length > 0) directiveInstances.set(el, directives);
    teardowns.set(el, hasBind ? setupBindings(el as HTMLElement) : () => {});
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
    if (el instanceof RxElementBase) {
        el._initBindings();
        queueMicrotask(() => el.onRender());
        return;
    }
    initNative(el);
    let child = el.firstElementChild;
    while (child !== null) {
        processAdded(child);
        child = child.nextElementSibling;
    }
};

const processRemoved = (el: Element): void => {
    destroy(el);
    let child = el.firstElementChild;
    while (child !== null) {
        processRemoved(child);
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

export const startObserver = (): void => {
    observer.observe(document.body, { childList: true, subtree: true });
};

export const flushExistingBindings = (): void => {
    const walk = (el: Element): void => {
        if (el instanceof RxElementBase) {
            el._initBindings();
        } else {
            initNative(el);
        }
        let child = el.firstElementChild;
        while (child !== null) {
            walk(child);
            child = child.nextElementSibling;
        }
    };
    walk(document.body);
};
