import { getTemplate, getProviders, getDirectives, getGlobalDirectives, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getPropDeps } from './di/inject.js';
import { type Observables } from './observable.js';
import { getDirectiveSelector, matchesSelector, type Directive } from './directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from './errors.js';

const renderScopeStack: RxElementBase[] = [];

export const pushRenderScope = (scope: RxElementBase): void => { renderScopeStack.push(scope); };
export const popRenderScope = (): void => { renderScopeStack.pop(); };

export class RxElementBase extends HTMLElement {
    declare hostNode: RxElementBase;
    __injector: Injector | undefined;
    private readonly directives: Directive[] = [];

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

    connectedCallback(): void {
        this.setupHostNode();
        this.setupInjectorAndDeps();
        this.setupDirectives();
        this.renderTemplate();
        this.onInit();
    }

    disconnectedCallback(): void {
        for (const directive of this.directives) { directive.onDestroy(); }
        this.directives.length = 0;
        this.onDestroy();
    }

    onInit(): void {}
    onDestroy(): void {}
}

export type RxElement<S = unknown> = RxElementBase & Observables<S>;

interface RxElementCtor {
    new <S = unknown>(): RxElement<S>;
    resolveInjector(el: Element): Injector;
}

export const RxElement: RxElementCtor = RxElementBase as unknown as RxElementCtor;
