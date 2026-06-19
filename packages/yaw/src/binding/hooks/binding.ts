/**
 * Binding hooks - allows directives to transform the observable
 * pipeline before setupBindings subscribes.
 *
 * Each hook declares a {@link BindingHookEntry.claim} predicate
 * that gates whether the transform runs for a given element. Only
 * one hook may claim a given element - if two hooks both claim,
 * a {@link DuplicateHookClaimError} is thrown.
 *
 * If no hooks are registered or none claim, the observable passes
 * through unchanged - zero overhead on the normal path.
 *
 * Example: rx-for registers a hook that pipes skip(1) for elements
 * it has stamped, preventing the redundant first emission from
 * overwriting values the stamp already wrote.
 */
import type { Observable } from 'rxjs';
import { DuplicateHookClaimError } from '../../errors.js';

/**
 * A binding hook entry. {@link claim} is checked before
 * {@link transform} runs. Only one hook may claim a given element.
 *
 * Typically the directive instance itself implements this interface -
 * claim checks whether the element was stamped by this directive,
 * transform modifies the observable pipeline.
 */
export interface BindingHookEntry {
    /**
     * Return true if this hook owns bindings on the given element.
     * @param el - The element being bound.
     */
    claim(el: Element): boolean;
    /**
     * Transform the binding observable for a claimed element.
     * Only called when {@link claim} returned true.
     * @param el - The element being bound.
     * @param binding$ - The original binding observable.
     * @returns {Observable<unknown>} The transformed observable.
     */
    transform(el: Element, binding$: Observable<unknown>): Observable<unknown>;
}

const bindingHooks: BindingHookEntry[] = [];

/**
 * Register a binding hook to transform subscription observables
 * before setupBindings subscribes.
 *
 * For lifecycle-managed registration, pair with
 * {@link unregisterBindingHook} via an {@link @yaw-rx/core/arc!Arc}.
 * The Arc acquires the hook on the first directive instance's onInit
 * and releases it when the last instance's onDestroy fires, avoiding
 * module-level side effects that live beyond the directive's lifetime.
 *
 * @param entry - The {@link BindingHookEntry} to register.
 * @returns {void}
 */
export const registerBindingHook = (entry: BindingHookEntry): void => { bindingHooks.push(entry); };

/**
 * Remove a previously registered binding hook.
 *
 * The entry must be the same object reference that was passed to
 * {@link registerBindingHook}. If the entry is not found in the
 * registry, this is a no-op - safe to call unconditionally during
 * teardown without guarding against double-dispose.
 *
 * For lifecycle-managed registration, pair with
 * {@link registerBindingHook} via an {@link @yaw-rx/core/arc!Arc}.
 * The Arc acquires the hook on the first directive instance's onInit
 * and releases it when the last instance's onDestroy fires, avoiding
 * module-level side effects that live beyond the directive's lifetime.
 *
 * @param entry - The same {@link BindingHookEntry} reference passed to {@link registerBindingHook}.
 * @returns {void}
 */
export const unregisterBindingHook = (entry: BindingHookEntry): void => {
    const idx = bindingHooks.indexOf(entry);
    if (idx !== -1) bindingHooks.splice(idx, 1);
};

/**
 * Run registered binding hooks on an observable. If a hook claims
 * the element, its transform is applied. If no hooks claim, returns
 * the input unchanged. If two hooks both claim, a
 * {@link DuplicateHookClaimError} is thrown.
 *
 * @param el - The element being bound.
 * @param binding$ - The original binding observable.
 * @returns {Observable<unknown>} The transformed observable.
 */
export const applyBindingHooks = (el: Element, binding$: Observable<unknown>): Observable<unknown> => {
    let claimed = false;
    for (const hook of bindingHooks) {
        if (hook.claim(el)) {
            if (claimed) throw new DuplicateHookClaimError('binding', `<${el.tagName.toLowerCase()}>`);
            binding$ = hook.transform(el, binding$);
            claimed = true;
        }
    }
    return binding$;
};
