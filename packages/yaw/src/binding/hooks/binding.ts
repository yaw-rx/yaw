/**
 * Binding hooks -- allows directives to transform the observable
 * pipeline before setupBindings subscribes.
 *
 * Hooks run in registration order. Each receives the element and
 * the observable from the previous hook, and returns a (possibly
 * modified) observable. If no hooks are registered, the loop body
 * never runs -- zero overhead on the normal path.
 *
 * Example: rx-for registers a hook that pipes skip(1) for elements
 * it has stamped, preventing the redundant first emission from
 * overwriting values the stamp already wrote.
 */
import type { Observable } from 'rxjs';

/**
 * A binding hook receives an element and its binding observable,
 * and returns a (possibly transformed) observable. Called by
 * setupBindings before subscribing.
 *
 * @param el - The element being bound.
 * @param binding$ - The observable from the previous hook (or the
 *   original if this is the first hook).
 * @returns {Observable<unknown>} The transformed observable.
 */
export type BindingHook = (el: Element, binding$: Observable<unknown>) => Observable<unknown>;

const bindingHooks: BindingHook[] = [];

/**
 * Register a binding hook to transform subscription observables
 * before setupBindings subscribes.
 *
 * @param hook - The {@link BindingHook} to register.
 * @returns {void}
 */
export const registerBindingHook = (hook: BindingHook): void => { bindingHooks.push(hook); };

/**
 * Run all registered binding hooks on an observable. Returns the
 * composed result. If no hooks are registered, returns the input
 * unchanged.
 *
 * @param el - The element being bound.
 * @param binding$ - The original binding observable.
 * @returns {Observable<unknown>} The transformed observable.
 */
export const applyBindingHooks = (el: Element, binding$: Observable<unknown>): Observable<unknown> => {
    for (const hook of bindingHooks) binding$ = hook(el, binding$);
    return binding$;
};
