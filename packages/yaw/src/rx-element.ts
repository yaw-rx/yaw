import { getTemplate, getProviders, getDirectives, getGlobalDirectives } from './component.js';
import { Injector } from './di/injector.js';
import { type Observables } from './observable.js';
import { getDirectiveSelector, matchesSelector, type Directive } from './directive.js';
import { DirectiveInstantiationError, InvalidSelectorError } from './errors.js';

export class RxElementBase extends HTMLElement {
    parentRef: RxElementBase | undefined;
    __injector: Injector | undefined;
    readonly rxChildren = new Set<RxElementBase>();
    private readonly directives: Directive[] = [];

    static resolveInjector(el: Element): Injector {
        let node: Element | null = el;
        while (node !== null) {
            const inj = (node as unknown as { __injector?: Injector }).__injector;
            if (inj !== undefined) return inj;
            node = node.parentElement;
        }
        throw new Error('No injector found in tree');
    }

    connectedCallback(): void {
        let node = this.parentElement;
        while (node !== null) {
            if (node instanceof RxElementBase) {
                this.parentRef = node;
                node.rxChildren.add(this);
                break;
            }
            node = node.parentElement;
        }

        const providers = getProviders(this.constructor);
        if (providers !== undefined) {
            this.__injector = RxElementBase.resolveInjector(this).child(providers);
        }

        const declaredDirectives = [
            ...getGlobalDirectives(),
            ...(this.parentRef !== undefined ? getDirectives(this.parentRef.constructor) ?? [] : []),
        ];

        for (const ctor of declaredDirectives) {
            const selector = getDirectiveSelector(ctor);
            if (selector === undefined) continue;
            if (!selector.startsWith('[') || !selector.endsWith(']')) {
                throw new InvalidSelectorError(ctor.name, selector);
            }
            if (!matchesSelector(this, selector)) continue;
            let directive: Directive;
            try {
                directive = RxElementBase.resolveInjector(this).instantiate(ctor);
            } catch (e) {
                throw new DirectiveInstantiationError(ctor.name, this.tagName, e);
            }
            directive.host = this;
            if (!selector.endsWith('*]')) {
                const attrName = selector.slice(1, -1);
                const raw = this.getAttribute(attrName) ?? '';
                directive.parsed = directive.parseExpr ? directive.parseExpr(raw) : { expr: raw };
            }
            directive.onInit();
            this.directives.push(directive);
        }

        const template = getTemplate(this.constructor);
        if (template !== undefined) {
            this.innerHTML = template;
        }

        this.onInit();
    }

    disconnectedCallback(): void {
        for (const directive of this.directives) directive.onDestroy();
        this.directives.length = 0;

        this.parentRef?.rxChildren.delete(this);
        this.parentRef = undefined;
        this.onDestroy();
    }

    onInit(): void {}
    onDestroy(): void {}
}

export type RxElement<S = unknown> = RxElementBase & Observables<S>;

interface RxElementCtor {
    new <S = unknown>(): RxElement<S>;
}

export const RxElement: RxElementCtor = RxElementBase as unknown as RxElementCtor;
