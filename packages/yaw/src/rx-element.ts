import { getTemplate, getProviders, getDirectives, getGlobalDirectives, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getPropDeps } from './di/inject.js';
import { getDirectiveSelector, matchesSelector, type Directive } from './directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from './errors.js';
import { setupBindings } from './setupBindings.js';
import { ssgEnter, ssgLeave, ssgFinalize } from './ssg-registry.js';
import { isSSG } from './component.js';

let pending = 0;
let readyResolve: (() => void) | undefined;
export const appReady = new Promise<void>((resolve) => { readyResolve = resolve; });

export const holdReady = (): void => { pending++; };
export const releaseReady = (): void => {
    queueMicrotask(() => {
        if (--pending === 0) {
            if (isSSG()) ssgFinalize();
            readyResolve?.();
        }
    });
};

let hydrating = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
export const isHydrating = (): boolean => hydrating;

import { ReplaySubject } from 'rxjs';
export const hydrationComplete$ = new ReplaySubject<void>(1);
export const setHydrating = (value: boolean): void => {
    hydrating = value;
    if (!value) hydrationComplete$.next();
};

const renderScopeStack: RxElementBase[] = [];

export const pushRenderScope = (scope: RxElementBase): void => { renderScopeStack.push(scope); };
export const popRenderScope = (): void => { renderScopeStack.pop(); };

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
    #directives: Directive[] = [];
    #bindingTeardown: (() => void) | undefined;

    #setupHostNode(): void {
        if (isComponent(this.constructor)) { this.setAttribute('data-rx-host', ''); }
        if (!Object.prototype.hasOwnProperty.call(this, 'hostNode')) {
            const scope = renderScopeStack[renderScopeStack.length - 1];
            if (scope !== undefined) {
                this.hostNode = scope;
            } else if (hydrating) {
                const host = this.parentElement?.closest('[data-rx-host]') as RxElementBase | null;
                if (host !== null) { this.hostNode = host; }
            }
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
        pushRenderScope(this);
        this.innerHTML = template;
        popRenderScope();
        const slot = this.querySelector('slot');
        if (slot !== null) { slot.replaceWith(projected); }
    }

    _initBindings(): void {
        this.#setupInjectorAndDeps();
        this.#bindingTeardown = setupBindings(this);
        this.#directives = setupDirectivesFor(this);
        const ssgPushed = ssgEnter(this.constructor, this);
        this.#renderTemplate();
        if (ssgPushed) ssgLeave();
        this.onInit();
        queueMicrotask(() => {
            if (--pending === 0) {
                if (isSSG()) ssgFinalize();
                readyResolve?.();
            }
        });
    }

    connectedCallback(): void {
        pending++;
        this.#setupHostNode();
        if (hydrating) {
            registerHydrationNode(this);
            return;
        }
        this._initBindings();
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

const hydrationRoots: RxElementBase[] = [];
const hydrationChildren = new Map<RxElementBase, RxElementBase[]>();

const registerHydrationNode = (el: RxElementBase): void => {
    const parent = Object.prototype.hasOwnProperty.call(el, 'hostNode') ? el.hostNode : undefined;
    if (parent !== undefined) {
        let kids = hydrationChildren.get(parent);
        if (kids === undefined) { kids = []; hydrationChildren.set(parent, kids); }
        kids.push(el);
    } else {
        hydrationRoots.push(el);
    }
};

export const flushHydrationBindings = (): void => {
    const walk = (el: RxElementBase): void => {
        el._initBindings();
        const kids = hydrationChildren.get(el);
        if (kids !== undefined) for (const child of kids) walk(child);
    };
    for (const root of hydrationRoots) walk(root);
    hydrationRoots.length = 0;
    hydrationChildren.clear();
};

export { RxElementBase as RxElement };
