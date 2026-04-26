import { getTemplate, getProviders, getDirectives, getGlobalDirectives, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getPropDeps } from './di/inject.js';
import { getObservableKeys } from './observable.js';
import { getDirectiveSelector, matchesSelector, type Directive } from './directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from './errors.js';
import { setupBindings } from './setupBindings.js';
import { decodeAttribute } from './attribute-codec/decode.js';
import { ssgEnter, ssgLeave, ssgFinalize } from './ssg-registry.js';
import { isSSG } from './component.js';

let pending = 0;
let readyResolve: (() => void) | undefined;
export const appReady = new Promise<void>((resolve) => { readyResolve = resolve; });

let hydrating = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
export const setHydrating = (value: boolean): void => { hydrating = value; };
export const isHydrating = (): boolean => hydrating;

const renderScopeStack: RxElementBase[] = [];

export const pushRenderScope = (scope: RxElementBase): void => { renderScopeStack.push(scope); };
export const popRenderScope = (): void => { renderScopeStack.pop(); };

export class RxElementBase extends HTMLElement {
    declare hostNode: RxElementBase;
    __injector: Injector | undefined;
    private readonly directives: Directive[] = [];
    private bindingTeardown: (() => void) | undefined;

    static resolveInjector(el: Element): Injector {
        let node: Element | null = el;
        while (node !== null) {
            const base = node as RxElementBase;
            if (base.__injector !== undefined) { return base.__injector; }
            node = node.parentElement;
        }
        throw new Error('No injector found in tree');
    }

    private setupHostNode(): void {
        if (isComponent(this.constructor)) { this.setAttribute('data-rx-host', ''); }
        if (!Object.prototype.hasOwnProperty.call(this, 'hostNode')) {
            const scope = renderScopeStack[renderScopeStack.length - 1];
            if (scope !== undefined) { this.hostNode = scope; }
        }
    }

    private setupInjectorAndDeps(): void {
        const providers = getProviders(this.constructor);
        if (providers !== undefined) {
            this.__injector = RxElementBase.resolveInjector(this).child(providers);
        }
        const propDeps = getPropDeps(this.constructor);
        if (propDeps !== undefined) {
            const injector = RxElementBase.resolveInjector(this);
            for (const [prop, token] of propDeps) {
                (this as unknown as Record<string | symbol, unknown>)[prop] = injector.resolve(token);
            }
        }
    }

    private setupDirectives(): void {
        const hostCtor = Object.prototype.hasOwnProperty.call(this, 'hostNode')
            ? this.hostNode.constructor
            : this.constructor;
        const declaredDirectives = [
            ...getGlobalDirectives(),
            ...(getDirectives(hostCtor) ?? []),
        ];
        for (const ctor of declaredDirectives) {
            const selector = getDirectiveSelector(ctor);
            if (selector === undefined) { continue; }
            if (!selector.startsWith('[') || !selector.endsWith(']')) {
                throw new InvalidSelectorError(ctor.name, selector);
            }
            if (!matchesSelector(this, selector)) { continue; }
            let directive: Directive;
            try {
                directive = RxElementBase.resolveInjector(this).instantiate(ctor);
            } catch (e) {
                throw new DirectiveInstantiationError(ctor.name, this.tagName, e);
            }
            directive.node = this;
            if (!selector.endsWith('*]')) {
                const attrName = selector.slice(1, -1);
                const raw = this.getAttribute(attrName) ?? '';
                directive.parsed = directive.parseExpr ? directive.parseExpr(raw) : { expr: raw };
            }
            directive.onInit();
            this.directives.push(directive);
        }
    }

    private renderTemplate(): void {
        if (hydrating) return;
        const template = getTemplate(this.constructor);
        if (template === undefined) { return; }
        const projected = document.createDocumentFragment();
        while (this.firstChild !== null) { projected.appendChild(this.firstChild); }
        pushRenderScope(this);
        this.innerHTML = template;
        popRenderScope();
        const slot = this.querySelector('rx-slot');
        if (slot !== null) { slot.replaceWith(projected); }
    }

    private restoreState(): void {
        if (!hydrating) return;
        const raw = this.getAttribute('data-rx-state');
        if (raw === null) return;
        const state = JSON.parse(raw) as Record<string, unknown>;
        const typeMap = (this.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
        for (const [key, value] of Object.entries(state)) {
            const typeName = typeMap?.[key];
            (this as unknown as Record<string, unknown>)[key] = typeName !== undefined
                ? decodeAttribute(typeName, key, value as string)
                : value;
        }
    }

    private readAttributes(): void {
        const keys = getObservableKeys(Object.getPrototypeOf(this) as object);
        const typeMap = (this.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
        for (const key of keys) {
            const raw = this.getAttribute(key);
            if (raw === null) continue;
            const typeName = typeMap?.[key];
            if (typeName !== undefined) {
                (this as unknown as Record<string, unknown>)[key] = decodeAttribute(typeName, key, raw);
            } else {
                const current = (this as unknown as Record<string, unknown>)[key];
                switch (typeof current) {
                    case 'number':  (this as unknown as Record<string, unknown>)[key] = Number(raw); break;
                    case 'boolean': (this as unknown as Record<string, unknown>)[key] = raw !== 'false'; break;
                    default:        (this as unknown as Record<string, unknown>)[key] = raw; break;
                }
            }
        }
    }

    connectedCallback(): void {
        pending++;
        this.setupHostNode();
        this.setupInjectorAndDeps();
        this.restoreState();
        this.readAttributes();
        this.bindingTeardown = setupBindings(this);
        this.setupDirectives();
        ssgEnter(this.constructor);
        this.renderTemplate();
        ssgLeave();
        this.onInit();
        queueMicrotask(() => {
            if (--pending === 0) {
                if (isSSG()) ssgFinalize();
                readyResolve?.();
            }
        });
    }

    disconnectedCallback(): void {
        this.bindingTeardown?.();
        for (const directive of this.directives) { directive.onDestroy(); }
        this.directives.length = 0;
        this.onDestroy();
    }

    onInit(): void {}
    onDestroy(): void {}
}

export { RxElementBase as RxElement };
