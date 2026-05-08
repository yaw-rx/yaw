/**
 * Type guard for Promise — any thenable with a `.then` method.
 *
 * Used during stamping resolution to detect async segment values
 * that need to be awaited before the DOM write. `instanceof` check
 * against the native Promise constructor — O(1).
 *
 * @param obj - The value to classify.
 * @returns {boolean} `true` if `obj` is a Promise.
 */
export const isPromise = (obj: unknown): obj is Promise<unknown> =>
    obj instanceof Promise;
