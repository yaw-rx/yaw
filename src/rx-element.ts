import { type Subscription } from 'rxjs';
import { getTemplate, getProviders } from './component.js';
import { Injector } from './di/injector.js';
import { runConnectHooks, runDisconnectHooks } from './registry.js';
import { type Observables } from './observable.js';

export class RxElementBase extends HTMLElement {
    parentRef: RxElementBase | undefined;
    __injector: Injector | undefined;
    readonly rxChildren = new Set<RxElementBase>();
    private readonly bindings: Subscription[] = [];

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

        for (const sub of runConnectHooks(this, this.parentRef)) {
            this.bindings.push(sub);
        }

        const providers = getProviders(this.constructor);
        if (providers !== undefined) {
            this.__injector = RxElementBase.resolveInjector(this).child(providers);
        }

        const template = getTemplate(this.constructor);
        if (template !== undefined) {
            this.innerHTML = template;
        }

        this.onInit();
    }

    disconnectedCallback(): void {
        for (const sub of this.bindings) sub.unsubscribe();
        this.bindings.length = 0;

        runDisconnectHooks(this, this.parentRef);

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
