import type { Ctor, Token } from './types.js';
import { registerDeps } from './registry.js';

export const Injectable = (deps?: readonly Token[]): ((ctor: Ctor) => void) =>
    (ctor: Ctor): void => {
        registerDeps(ctor, deps ?? []);
    };
