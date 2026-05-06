/**
 * native.ts - MutationObserver that initializes and tears down
 * bindings on elements as they enter and leave the DOM.
 *
 * The observer watches document.body with { childList: true,
 * subtree: true }. For each added element:
 *   - RxElement: calls _initBindings() and defers onRender() via
 *     queueMicrotask (so the subtree is fully connected first).
 *   - Native element: checks for data-rx-bind-* attributes and
 *     directive selector matches. If either is present, runs
 *     setupBindings / setupDirectivesFor and stores the teardown
 *     and directive instances in per-element WeakMaps.
 *   - Recursively processes all children depth-first.
 *
 * For each removed element: calls the stored teardown function,
 * calls onDestroy on each directive instance, deletes WeakMap
 * entries. Recurses into children.
 *
 * flushExistingBindings walks the entire document.body tree and
 * initializes every element - used after hydration to process the
 * pre-existing SSG DOM that was present before the observer started.
 */
import { setupBindings } from './setup.js';
import { setupDirectivesFor } from '../directives/setup.js';
import { RxElement } from '../rx-element.js';
import type { Directive } from '../directive.js';

const hasBinding = (el: Element): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('data-rx-bind-')) return true;
    }
    return false;
};

const teardowns = new WeakMap<Element, () => void>();
const directiveInstances = new WeakMap<Element, Directive[]>();

const initNativeBindings = (el: Element): void => {
    if (teardowns.has(el)) return;
    const directives = setupDirectivesFor(el);
    const hasBindings = hasBinding(el);
    if (directives.length === 0 && !hasBindings) return;
    if (directives.length > 0) directiveInstances.set(el, directives);
    teardowns.set(el, hasBindings ? setupBindings(el as HTMLElement) : () => {});
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
    if (el instanceof RxElement) {
        el._initBindings();
        queueMicrotask(() => el.onRender());
        return;
    }
    initNativeBindings(el);
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
        if (el instanceof RxElement) {
            el._initBindings();
            queueMicrotask(() => el.onRender());
        } else {
            initNativeBindings(el);
        }
        let child = el.firstElementChild;
        while (child !== null) {
            walk(child);
            child = child.nextElementSibling;
        }
    };
    walk(document.body);
};
