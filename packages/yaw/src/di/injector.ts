import { getDeps } from './registry.js';
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

export class NoProviderError extends Error {
    public constructor(token: Token) {
        const name = typeof token === 'function' ? token.name : String(token);
        super(`No provider for ${name}`);
    }
}

export class Injector {
    private readonly providers: ReadonlyMap<Token, Normalized>;
    private readonly instances = new Map<Token, unknown>();
    private readonly parent: Injector | null;

    public constructor(providers: readonly Provider[], parent: Injector | null = null) {
        const map = new Map<Token, Normalized>();
        for (const p of providers) {
            const n = normalize(p);
            map.set(n.token, n);
        }
        this.providers = map;
        this.parent = parent;
    }

    public resolve<T>(token: Token<T>): T {
        const cached = this.instances.get(token);
        if (cached !== undefined) {
            return cached as T;
        }
        const provider = this.providers.get(token);
        if (provider !== undefined) {
            const instance = provider.create(this);
            this.instances.set(token, instance);
            return instance as T;
        }
        if (this.parent !== null) {
            return this.parent.resolve(token);
        }
        throw new NoProviderError(token);
    }

    public instantiate<T>(ctor: Ctor<T>): T {
        const args = getDeps(ctor).map((t) => this.resolve(t));
        return Reflect.construct(ctor, args) as T;
    }

    public child(providers: readonly Provider[]): Injector {
        return new Injector(providers, this);
    }

    public forEachInstance(fn: (instance: unknown) => void): void {
        for (const instance of this.instances.values()) fn(instance);
    }
}
