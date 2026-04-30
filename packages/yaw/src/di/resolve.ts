import { Injector } from './injector.js';

export const resolveInjector = (el: Element): Injector => {
    let node: Element | null = el;
    while (node !== null) {
        const injector = (node as unknown as { __injector?: Injector }).__injector;
        if (injector !== undefined) { return injector; }
        node = node.parentElement;
    }
    throw new Error('No injector found in tree');
};
