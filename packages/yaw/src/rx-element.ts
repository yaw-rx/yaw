import { getTemplate, getProviders, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getPropDeps } from './di/inject.js';
import { resolveInjector } from './di/resolve.js';
import { setupDirectivesFor } from './directives/setup.js';
import type { Directive } from './directive.js';
import { setupBindings } from './setupBindings.js';
import { isHydrating } from './ssg/hydrate/hydration-state.js';

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
        if (isHydrating()) return;
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
