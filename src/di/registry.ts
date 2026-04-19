import type { Ctor, Token } from './types.js';

const depsMap = new Map<Ctor, readonly Token[]>();

export const registerDeps = (ctor: Ctor, deps: readonly Token[]): void => {
    depsMap.set(ctor, deps);
};

export const getDeps = (ctor: Ctor): readonly Token[] => depsMap.get(ctor) ?? [];

