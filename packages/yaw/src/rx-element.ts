/**
 * rx-element.ts - base class for all yaw components.
 *
 * Every @Component-decorated class extends RxElement, which extends
 * HTMLElement. Instance state lives in private fields:
 *   - `hostNode`: nearest ancestor with `data-rx-host`, set during
 *     connectedCallback by walking up with closest().
 *   - `__injector`: a child Injector, created only if the component
 *     declares providers.
 *   - `#initialized`: gate flag - _initBindings is a one-shot.
 *   - `#directives` / `#bindingTeardown`: populated during init,
 *     cleaned up during disconnectedCallback.
 *
 * Initialization (_initBindings):
 *   1. Resolve DI: create child injector if providers exist, then
 *      resolve @Inject fields from the injector tree.
 *   2. Wire bindings: setupBindings reads data-rx-bind-* attributes
 *      and subscribes to the resolved observables.
 *   3. Instantiate directives: setupDirectivesFor matches directive
 *      selectors against the element's attributes.
 *   4. Render template: replace innerHTML with the compiled template,
 *      projecting existing children into the <slot> position.
 *      Skipped during hydration - the SSG DOM is already present.
 *   5. Call onInit().
 *
 * Teardown (disconnectedCallback): unsubscribes bindings, calls
 * onDestroy on each directive, destroys injector instances, then
 * calls the component's onDestroy hook.
 */
import { getTemplate, getProviders, isComponent } from './component.js';
import { Injector } from './di/injector.js';
import { getInjectMetadata } from './di/inject.js';
import { resolveInjector } from './di/resolve.js';
import { setupDirectivesFor } from './directives/setup.js';
import type { Directive } from './directive.js';
import { setupBindings } from './binding/setup.js';
import { isHydrating } from './hydrate/state.js';

/**
 * Base class for all yaw components. Extend this in any
 * @Component-decorated class. Handles DI resolution, binding
 * setup, directive instantiation, template rendering, and
 * content projection via `<slot>`.
 */
export class RxElement extends HTMLElement {
    /** The closest `[data-rx-host]` element in the DOM tree. */
    declare hostNode: RxElement;
    __injector: Injector | undefined;
    #initialized = false;
    #directives: Directive[] = [];
    #bindingTeardown: (() => void) | undefined;

    _setupHostNode(): void {
        if (isComponent(this.constructor)) { this.setAttribute('data-rx-host', ''); }
        if (!Object.prototype.hasOwnProperty.call(this, 'hostNode')) {
            const host = this.parentElement?.closest('[data-rx-host]') as RxElement | null;
            if (host !== null) { this.hostNode = host; }
        }
    }

    _setupInjectorAndDeps(): void {
        if (this.__injector !== undefined) return;
        const providers = getProviders(this.constructor);
        if (providers !== undefined) {
            this.__injector = resolveInjector(this).child(providers);
        }
        const injectMetadata = getInjectMetadata(this.constructor);
        if (injectMetadata !== undefined) {
            const injector = resolveInjector(this);
            for (const [prop, token] of injectMetadata) {
                (this as unknown as Record<string | symbol, unknown>)[prop] = injector.resolve(token);
            }
        }
    }

    _renderTemplate(): void {
        if (isHydrating()) return;
        if (this.firstChild !== null) return;
        const template = getTemplate(this.constructor);
        if (template === undefined) { return; }
        const projected = document.createDocumentFragment();
        while (this.firstChild !== null) { projected.appendChild(this.firstChild); }
        this.innerHTML = template;
        const slot = this.querySelector('slot');
        if (slot !== null) { slot.replaceWith(projected); }
    }

    /**
     * One-shot initialization. Resolves DI, wires bindings,
     * instantiates directives, renders template, calls onInit().
     * Called by the MutationObserver in native.ts.
     * @internal
     * @returns {void}
     */
    _initBindings(): void {
        if (this.#initialized) return;
        this.#initialized = true;
        this._setupInjectorAndDeps();
        this.#bindingTeardown = setupBindings(this);
        this.#directives = setupDirectivesFor(this);
        this._renderTemplate();
        this.onInit();
    }

    /** @internal */
    connectedCallback(): void {
        this._setupHostNode();
    }

    /** @internal */
    disconnectedCallback(): void {
        this.#bindingTeardown?.();
        for (const directive of this.#directives) { directive.onDestroy(); }
        this.#directives.length = 0;
        this.__injector?.destroyInstances();
        this.onDestroy();
    }

    /**
     * Called after bindings, DI, and template are live.
     * Override in subclass to run setup logic.
     * @returns {void}
     */
    onInit(): void {}

    /**
     * Called one microtask after onInit. Child elements and
     * `#ref` captures are available. Override in subclass to
     * work with rendered DOM.
     * @returns {void}
     */
    onRender(): void {}

    /**
     * Called on removal after the framework has torn down
     * bindings and directives. Override in subclass to clean
     * up subscriptions or external resources you own.
     * @returns {void}
     */
    onDestroy(): void {}
}

