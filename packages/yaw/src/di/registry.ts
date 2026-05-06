import type { Ctor, Token } from './types.js';

const depsMap = new Map<Ctor, readonly Token[]>();

export const registerTokenDeps = (ctor: Ctor, deps: readonly Token[]): void => {
    depsMap.set(ctor, deps);
};

export const getTokenDeps = (ctor: Ctor): readonly Token[] => depsMap.get(ctor) ?? [];

