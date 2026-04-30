import { getTemplate, getProviders, getDirectives, getGlobalDirectives, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getPropDeps } from './di/inject.js';
import { getDirectiveSelector, matchesSelector, type Directive } from './directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from './errors.js';
import { setupBindings } from './setupBindings.js';

let hydrating = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
export const isHydrating = (): boolean => hydrating;

import { ReplaySubject } from 'rxjs';
export const hydrationComplete$ = new ReplaySubject<void>(1);
export const setHydrating = (value: boolean): void => {
    hydrating = value;
    if (!value) hydrationComplete$.next();
};

export const resolveInjector = (el: Element): Injector => {
    let node: Element | null = el;
    while (node !== null) {
        const base = node as RxElementBase;
        if (base.__injector !== undefined) { return base.__injector; }
        node = node.parentElement;
    }
    throw new Error('No injector found in tree');
};

export const setupDirectivesFor = (el: Element): Directive[] => {
    const host = el.parentElement?.closest('[data-rx-host]') as RxElementBase | null ?? undefined;
    const hostCtor = host !== undefined ? host.constructor : el.constructor;
    const declaredDirectives = [
        ...getGlobalDirectives(),
        ...(getDirectives(hostCtor) ?? []),
    ];
    const directives: Directive[] = [];
    for (const ctor of declaredDirectives) {
        const selector = getDirectiveSelector(ctor);
        if (selector === undefined) { continue; }
        if (!selector.startsWith('[') || !selector.endsWith(']')) {
            throw new InvalidSelectorError(ctor.name, selector);
        }
        if (!matchesSelector(el, selector)) { continue; }
        let directive: Directive;
        try {
            directive = resolveInjector(el).instantiate(ctor);
        } catch (e) {
            throw new DirectiveInstantiationError(ctor.name, el.tagName, e);
        }
        directive.node = el as RxElementBase;
        if (!selector.endsWith('*]')) {
            const attrName = selector.slice(1, -1);
            const raw = el.getAttribute(attrName) ?? '';
            directive.parsed = directive.parseExpr ? directive.parseExpr(raw) : { expr: raw };
        }
        directive.onInit();
        directives.push(directive);
    }
    return directives;
};

export class RxElementBase extends HTMLElement {
    declare hostNode: RxElementBase;
    __injector: Injector | undefined;
    #initialized = false;
    #directives: Directive[] = [];
    #bindingTeardown: (() => void) | undefined;

    #setupHostNode(): void {
        if (isComponent(this.constructor)) { this.setAttribute('data-rx-host', ''); }
        if (!Object.prototype.hasOwnProperty.call(this, 'hostNode')) {
            const host = this.parentElement?.closest('[data-rx-host]') as RxElementBase | null;
            if (host !== null) { this.hostNode = host; }
        }
    }

    #setupInjectorAndDeps(): void {
        const providers = getProviders(this.constructor);
        if (providers !== undefined) {
            this.__injector = resolveInjector(this).child(providers);
        }
        const propDeps = getPropDeps(this.constructor);
        if (propDeps !== undefined) {
            const injector = resolveInjector(this);
            for (const [prop, token] of propDeps) {
                (this as unknown as Record<string | symbol, unknown>)[prop] = injector.resolve(token);
            }
        }
    }

    #renderTemplate(): void {
        if (hydrating) return;
        const template = getTemplate(this.constructor);
        if (template === undefined) { return; }
        const projected = document.createDocumentFragment();
        while (this.firstChild !== null) { projected.appendChild(this.firstChild); }
        this.innerHTML = template;
        const slot = this.querySelector('slot');
        if (slot !== null) { slot.replaceWith(projected); }
    }

    _initBindings(): void {
        if (this.#initialized) return;
        this.#initialized = true;
        this.#setupInjectorAndDeps();
        this.#bindingTeardown = setupBindings(this);
        this.#directives = setupDirectivesFor(this);
        this.#renderTemplate();
        this.onInit();
    }

    connectedCallback(): void {
        this.#setupHostNode();
    }

    disconnectedCallback(): void {
        this.#bindingTeardown?.();
        for (const directive of this.#directives) { directive.onDestroy(); }
        this.#directives.length = 0;
        this.onDestroy();
    }

    onInit(): void {}
    onDestroy(): void {}
}

export { RxElementBase as RxElement };
