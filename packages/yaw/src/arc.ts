/**
 * arc.ts - atomic reference counting.
 *
 * An Arc wraps a resource with acquire/release semantics and an
 * atomic counter. The resource is created lazily on the first
 * {@link Arc.retain} (0 to 1) and torn down on the last
 * {@link Arc.dispose} (1 to 0). Between those transitions the
 * counter increments and decrements with no side effects.
 *
 * Each Arc is keyed by a Symbol that acts as its unique identity.
 */

/**
 * An atomic reference-counted resource. The resource is acquired
 * lazily on the first {@link retain} and released when the last
 * holder calls {@link dispose}.
 *
 * @template T - The type of the managed resource.
 */
export interface Arc<T> {
    /** Unique identity for this reference-counted resource. */
    readonly key: symbol;
    /**
     * Increment the reference count. On the transition from 0 to 1
     * the acquire function runs and its return value is cached.
     * @returns The acquired resource.
     */
    retain(): T;
    /**
     * Decrement the reference count. On the transition from 1 to 0
     * the release function runs and the cached value is cleared.
     * @returns {void}
     */
    dispose(): void;
}

/**
 * Options for {@link createArc}.
 *
 * @template T - The type of the managed resource.
 */
export interface ArcOptions<T> {
    /**
     * Called on the transition from 0 to 1 holders.
     * @returns The resource to cache and return from {@link Arc.retain}.
     */
    acquire: () => T;
    /**
     * Called on the transition from 1 to 0 holders.
     * @param value - The cached resource returned by {@link acquire}.
     * @returns {void}
     */
    release: (value: T) => void;
}

/**
 * Create an atomic reference-counted resource.
 *
 * The Symbol uniquely identifies the resource. Multiple holders
 * share the same {@link Arc} - the first to retain triggers
 * acquire, the last to dispose triggers release.
 *
 * @template T - The type of the managed resource.
 * @param key - Symbol identity for this resource.
 * @param options - The {@link ArcOptions} defining acquire and release.
 * @returns An {@link Arc} instance.
 */
export const createArc = <T>(key: symbol, options: ArcOptions<T>): Arc<T> => {
    let count = 0;
    let value: T | undefined;

    return {
        key,
        retain() {
            if (count === 0) value = options.acquire();
            count++;
            return value!;
        },
        dispose() {
            count--;
            if (count === 0) {
                options.release(value!);
                value = undefined;
            }
        },
    };
};
