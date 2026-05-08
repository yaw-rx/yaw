/**
 * A mutation hook receives the full array of MutationRecords from
 * the framework's MutationObserver before the core processes them.
 *
 * Hooks run in registration order. Each hook may mutate the records
 * array (e.g. splicing out nodes it claims) so that the core's
 * default processing skips them. This allows directives like rx-for
 * to handle their own children — rAF scheduling, batch stamping,
 * deferred teardown — without the core needing any knowledge of them.
 *
 * @param records - Mutable array of MutationRecords. Hooks may splice
 *   entries or remove nodes from addedNodes/removedNodes by reference.
 */
export type MutationHook = (records: MutationRecord[]) => void;

/** Registered mutation hooks, called in order before core processing. */
export const mutationHooks: MutationHook[] = [];

/**
 * Register a mutation hook to intercept DOM mutations before core processing.
 *
 * Any directive that needs custom render scheduling (rAF batching,
 * deferred teardown, etc.) registers a hook here. The hook receives
 * the MutationRecords array and can claim nodes by mutating it,
 * preventing the core from processing them with the default
 * processAdded/processRemoved paths.
 *
 * Multiple hooks can be registered — they run in registration order,
 * each seeing the (possibly mutated) array from the previous hook.
 *
 * @param hook - The {@link MutationHook} to register.
 * @returns {void}
 */
export const registerMutationHook = (hook: MutationHook): void => { mutationHooks.push(hook); };
