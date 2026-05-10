/**
 * A mutation hook claims DOM mutations on its container before the
 * core's default initElement/destroyElement runs.
 *
 * {@link MutationHookEntry.claim} is called with the target element of each
 * MutationRecord. If it returns true, element nodes from addedNodes/removedNodes
 * are collected and passed to {@link MutationHookEntry.handle} instead of the
 * core. This allows directives like rx-for to handle their own children  - rAF
 * scheduling, batch stamping, deferred teardown  - without the core needing
 * any knowledge of them.
 *
 * The observer iterates the raw MutationRecord list once  - no copy,
 * no splice. If two hooks claim the same target, a
 * {@link DuplicateHookClaimError} is thrown.
 */
export interface MutationHookEntry {
    /** Return true if this hook owns mutations on the given target. */
    claim(target: Element): boolean;
    /**
     * Called with the element nodes claimed from matching records.
     * @param target - The container element that was mutated.
     * @param added - Elements added to the claimed container.
     * @param removed - Elements removed from the claimed container.
     */
    handle(target: Element, added: Element[], removed: Element[]): void;
}

/** Registered mutation hooks, checked via {@link MutationHookEntry.claim} on each record's target. */
export const mutationHooks: MutationHookEntry[] = [];

/**
 * Register a mutation hook to claim DOM mutations on a directive's
 * container.
 *
 * Any directive that needs custom render scheduling (rAF batching,
 * deferred teardown, etc.) registers a hook here. The hook's
 * {@link MutationHookEntry.claim} is checked against each
 * MutationRecord's target  - if it returns true, the record's nodes
 * are routed to {@link MutationHookEntry.handle} instead of the
 * core's initElement/destroyElement.
 *
 * Multiple hooks can be registered. They are checked in registration
 * order. Only one hook may claim a given target  - if two hooks both
 * claim the same target, a {@link DuplicateHookClaimError} is thrown.
 *
 * @param entry - The {@link MutationHookEntry} to register.
 * @returns {void}
 */
export const registerMutationHook = (entry: MutationHookEntry): void => { mutationHooks.push(entry); };
