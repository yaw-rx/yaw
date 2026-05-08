import type { BehaviorSubject } from 'rxjs';

/**
 * Result returned by a scope hook when it claims a binding segment.
 *
 * The hook intercepts binding resolution before the normal host walk.
 * If a directive (e.g. rx-for) owns the first segment of a binding
 * path, it returns a ScopeHookResult so the binding chain roots on
 * the directive's stream instead of walking the DOM.
 */
export interface ScopeHookResult {
    /** Observable root for the claimed segment. */
    readonly stream: BehaviorSubject<unknown>;
    /** Number of path segments consumed by the hook (typically 1). */
    readonly consumed: number;
}

/**
 * A scope hook intercepts binding path resolution for directive-owned names.
 *
 * Called before the host walk on every binding. If the hook recognises
 * the first path segment as belonging to its directive scope, it returns
 * a {@link ScopeHookResult}. Otherwise it returns `undefined` and the
 * normal host walk proceeds.
 *
 * @param host - The element the binding is attached to.
 * @param segment - The first segment of the binding path being resolved.
 * @returns A {@link ScopeHookResult} if the segment is claimed, `undefined` otherwise.
 */
export type ScopeHook = (host: Element, segment: string) => ScopeHookResult | undefined;

/** Registered scope hooks, checked in order until one claims the segment. */
export const scopeHooks: ScopeHook[] = [];

/**
 * Register a scope hook to intercept binding path resolution.
 *
 * Directives that introduce names into their subtree (e.g. rx-for
 * introducing loop variables) call this so that bindings inside
 * their scope resolve against the directive's stream rather than
 * walking up to an ancestor host.
 *
 * Multiple hooks can be registered. On each binding resolution,
 * hooks are checked in registration order — the first to return
 * a {@link ScopeHookResult} wins and remaining hooks are skipped.
 *
 * @param hook - The {@link ScopeHook} to register.
 * @returns {void}
 */
export const registerScopeHook = (hook: ScopeHook): void => { scopeHooks.push(hook); };
