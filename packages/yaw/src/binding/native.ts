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
import { mutationHooks } from './hooks/mutation.js';
import { DuplicateHookClaimError } from '../errors.js';

/**
 * Returns true if the element has any `data-rx-bind-*` attributes.
 * @param el - The element to check.
 * @returns {boolean}
 */
export const hasBinding = (el: Element): boolean => {
    for (let i = 0; i < el.attributes.length; i++) {
        if (el.attributes[i]!.name.startsWith('data-rx-bind-')) return true;
    }
    return false;
};


/**
 * Store a binding teardown and directive instances for an element so
 * that {@link destroyElement} can clean them up later. Used by
 * mutation hooks that take over child initialisation from the core
 * observer.
 *
 * @param el - The element to register teardown for.
 * @param teardown - Function that unsubscribes bindings.
 * @param directives - Directive instances to destroy on removal.
 */
export const registerElementTeardown = (el: Element, teardown: () => void, directives: Directive[]): void => {
    const e = el as any;
    e.__rx_teardown = teardown;
    if (directives.length > 0) e.__rx_directives = directives;
};

const initNativeBindings = (el: Element): void => {
    const e = el as any;
    if (e.__rx_teardown) return;
    const directives = setupDirectivesFor(el);
    const hasBindings = hasBinding(el);
    if (directives.length === 0 && !hasBindings) return;
    if (directives.length > 0) e.__rx_directives = directives;
    e.__rx_teardown = hasBindings ? setupBindings(el as HTMLElement) : () => {};
};

const destroy = (el: Element): void => {
    const e = el as any;
    e.__rx_init = false;
    const td = e.__rx_teardown;
    if (td !== undefined) { td(); e.__rx_teardown = undefined; }
    const dirs = e.__rx_directives;
    if (dirs !== undefined) {
        for (const d of dirs) d.onDestroy();
        e.__rx_directives = undefined;
    }
};

/**
 * Initialise an element and its subtree - wire up bindings, directives,
 * and component lifecycle.
 *
 * RxElements: runs `_initBindings()` and queues `onRender()` as a
 * microtask (so template children are fully connected first). Does NOT
 * recurse - the MutationObserver picks up template children separately.
 *
 * Native elements: checks for `data-rx-bind-*` attributes and directive
 * selector matches. If either is present, sets up bindings/directives and
 * stores teardown references. Recurses depth-first into children.
 *
 * @param el - The element to initialise. Must be connected to the DOM.
 * @param host - Known host element to propagate, avoiding per-element `closest` walks.
 * @returns {void}
 */
export const initElement = (el: Element, host?: Element): void => {
    if (!el.isConnected) return;
    if (el instanceof RxElement) {
        el._initBindings();
        (el as any).__rx_init = true;
        queueMicrotask(() => el.onRender());
        return;
    }
    if (host === undefined) {
        host = el.parentElement?.closest('[data-rx-host]') as Element ?? undefined;
    }
    if (host !== undefined) {
        (el as any).hostNode = host;
    }
    initNativeBindings(el);
    (el as any).__rx_init = true;
    let child = el.firstElementChild;
    while (child !== null) {
        initElement(child, host);
        child = child.nextElementSibling;
    }
};

/**
 * Tear down an element and its subtree - unsubscribe bindings, destroy
 * directives, clean up WeakMap entries. Recurses depth-first into children.
 *
 * @param el - The element to tear down.
 * @returns {void}
 */
export const destroyElement = (el: Element): void => {
    destroy(el);
    let child = el.firstElementChild;
    while (child !== null) {
        destroyElement(child);
        child = child.nextElementSibling;
    }
};

const observer = new MutationObserver((raw) => {
    for (const record of raw) {
        const target = record.target;
        let claimed = false;
        if (target instanceof Element && mutationHooks.length > 0) {
            for (const hook of mutationHooks) {
                if (hook.claim(target)) {
                    if (claimed) throw new DuplicateHookClaimError('mutation', `<${target.tagName.toLowerCase()}>`);
                    const added: Element[] = [];
                    const removed: Element[] = [];
                    for (const n of record.removedNodes) if (n.nodeType === 1) removed.push(n as Element);
                    for (const n of record.addedNodes) if (n.nodeType === 1) added.push(n as Element);
                    hook.handle(target, added, removed);
                    claimed = true;
                }
            }
        }
        if (!claimed) {
            for (const node of record.removedNodes) {
                if (node.nodeType === 1 && !node.isConnected) destroyElement(node as Element);
            }
            for (const node of record.addedNodes) {
                if (node.nodeType !== 1) continue;
                const el = node as Element;
                if ((el as any).__rx_init) continue;
                initElement(el);
            }
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
            (el as any).__rx_init = true;
            queueMicrotask(() => el.onRender());
        } else {
            initNativeBindings(el);
            (el as any).__rx_init = true;
        }
        let child = el.firstElementChild;
        while (child !== null) {
            walk(child);
            child = child.nextElementSibling;
        }
    };
    walk(document.body);
};
