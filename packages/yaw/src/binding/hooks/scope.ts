import type { BehaviorSubject } from 'rxjs';

/**
 * Result returned by a scope hook when it resolves a binding segment.
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
 * {@link ScopeHookEntry.claim} is called before the host walk on every
 * binding with the element and the first path segment. If it returns true,
 * {@link ScopeHookEntry.resolve} is called to produce a {@link ScopeHookResult}.
 * If claim returns false, the next hook is tried. If no hook claims, the
 * normal host walk proceeds.
 *
 * Typically the directive instance itself implements this interface - claim
 * checks its own loopVariables, resolve returns its own BehaviorSubject.
 */
export interface ScopeHookEntry {
    /**
     * Return true if this hook owns the given segment for the given element.
     * @param host - The element the binding is attached to.
     * @param segment - The first segment of the binding path being resolved.
     */
    claim(host: Element, segment: string): boolean;
    /**
     * Resolve the claimed segment to a stream root.
     * Only called when {@link claim} returned true.
     * @param host - The element the binding is attached to.
     * @param segment - The first segment of the binding path being resolved.
     * @returns The {@link ScopeHookResult} for the claimed segment.
     */
    resolve(host: Element, segment: string): ScopeHookResult;
}

/** Registered scope hooks, checked in order until one claims the segment. */
export const scopeHooks: ScopeHookEntry[] = [];

/**
 * Register a scope hook to intercept binding path resolution.
 *
 * Directives that introduce names into their subtree (e.g. rx-for
 * introducing loop variables) call this so that bindings inside
 * their scope resolve against the directive's stream rather than
 * walking up to an ancestor host.
 *
 * Multiple hooks can be registered. On each binding resolution,
 * hooks are checked in registration order - the first to claim
 * wins and remaining hooks are skipped.
 *
 * @param entry - The {@link ScopeHookEntry} to register.
 * @returns {void}
 */
export const registerScopeHook = (entry: ScopeHookEntry): void => { scopeHooks.push(entry); };
