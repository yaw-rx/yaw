/**
 * injector.ts - hierarchical dependency injection container.
 *
 * Each Injector holds a ReadonlyMap<Token, Normalized> of providers
 * and a Map<Token, unknown> of lazily-created instances. Providers
 * are normalized at construction into a uniform { token, create }
 * shape from five input forms: bare class, useClass, useValue,
 * useFactory (with explicit deps array), and useExisting (alias).
 *
 * Resolution (resolve):
 *   1. Check the local instances cache - return immediately if hit.
 *   2. Check local providers - call create(this), cache the result,
 *      then call onInit() on the instance if the method exists.
 *   3. If neither found, delegate to parent. If no parent, throw
 *      NoProviderError.
 *
 * Instantiation (instantiate): looks up the constructor's token
 * deps from the registry (registered by @Injectable), resolves
 * each dep through this injector, then Reflect.constructs the class.
 *
 * Lifecycle: destroyInstances iterates all cached instances and
 * calls onDestroy() on each that has the method. forEachInstance
 * exposes the cache for SSG serialization.
 */
import { getTokenDeps } from './registry.js';
import type { Ctor, Provider, Token } from './types.js';

interface Normalized {
    readonly token: Token;
    readonly create: (inj: Injector) => unknown;
}

const normalize = (p: Provider): Normalized => {
    if (typeof p === 'function') {
        return { token: p, create: (inj) => inj.instantiate(p) };
    }
    if ('useClass' in p) {
        return { token: p.provide, create: (inj) => inj.instantiate(p.useClass) };
    }
    if ('useValue' in p) {
        return { token: p.provide, create: () => p.useValue };
    }
    if ('useFactory' in p) {
        const { provide, useFactory, deps } = p;
        return {
            token: provide,
            create: (inj) => {
                const args = deps.map((d) => inj.resolve(d));
                return (useFactory as (...a: readonly unknown[]) => unknown)(...args);
            },
        };
    }
    return { token: p.provide, create: (inj) => inj.resolve(p.useExisting) };
};

/**
 * Thrown when a token cannot be resolved in any injector in the chain.
 */
export class NoProviderError extends Error {
    /**
     * @param {Token} token - The token that could not be resolved.
     */
    public constructor(token: Token) {
        const name = typeof token === 'function' ? token.name : String(token);
        super(`No provider for ${name}`);
    }
}

/**
 * Hierarchical dependency injection container. Normalizes providers
 * at construction, lazily creates instances on first resolve, and
 * delegates to parent when a token is not found locally.
 */
export class Injector {
    private readonly providers: ReadonlyMap<Token, Normalized>;
    private readonly instances = new Map<Token, unknown>();
    private readonly parent: Injector | null;

    /**
     * @param {readonly Provider[]} providers - Provider definitions to normalize and register.
     * @param {Injector | null} parent - Parent injector for delegation. Null for root.
     */
    public constructor(providers: readonly Provider[], parent: Injector | null = null) {
        const map = new Map<Token, Normalized>();
        for (const p of providers) {
            const n = normalize(p);
            map.set(n.token, n);
        }
        this.providers = map;
        this.parent = parent;
    }

    /**
     * Resolves a token to its instance. Checks the local cache, then
     * local providers, then delegates to the parent injector.
     * @template T - The resolved instance type.
     * @param {Token<T>} token - The DI token to resolve.
     * @returns {T} The resolved instance.
     * @throws {NoProviderError} If the token is not provided in any injector in the chain.
     */
    public resolve<T>(token: Token<T>): T {
        const cached = this.instances.get(token);
        if (cached !== undefined) {
            return cached as T;
        }
        const provider = this.providers.get(token);
        if (provider !== undefined) {
            const instance = provider.create(this);
            this.instances.set(token, instance);
            if (instance != null && typeof (instance as Record<string, unknown>)['onInit'] === 'function') {
                (instance as { onInit(): void }).onInit();
            }
            return instance as T;
        }
        if (this.parent !== null) {
            return this.parent.resolve(token);
        }
        throw new NoProviderError(token);
    }

    /**
     * Creates an instance of a class by resolving its registered
     * constructor dependencies and calling Reflect.construct.
     * @template T - The class instance type.
     * @param {Ctor<T>} ctor - The class constructor.
     * @returns {T} The new instance.
     */
    public instantiate<T>(ctor: Ctor<T>): T {
        const args = getTokenDeps(ctor).map((t) => this.resolve(t));
        return Reflect.construct(ctor, args) as T;
    }

    /**
     * Creates a child injector with this injector as parent.
     * @param {readonly Provider[]} providers - Providers for the child scope.
     * @returns {Injector} The new child injector.
     */
    public child(providers: readonly Provider[]): Injector {
        return new Injector(providers, this);
    }

    /**
     * Calls onDestroy() on every cached instance that has the method.
     * @returns {void}
     */
    public destroyInstances(): void {
        for (const instance of this.instances.values()) {
            if (instance != null && typeof (instance as Record<string, unknown>)['onDestroy'] === 'function') {
                (instance as { onDestroy(): void }).onDestroy();
            }
        }
    }

    /**
     * Iterates all cached instances. Used by SSG serialization.
     * @param {(instance: unknown) => void} fn - Callback invoked with each instance.
     * @returns {void}
     */
    public forEachInstance(fn: (instance: unknown) => void): void {
        for (const instance of this.instances.values()) fn(instance);
    }
}
