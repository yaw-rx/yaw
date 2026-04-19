import 'reflect-metadata';
import type { Ctor, Token } from './types.js';
import { registerDeps } from './registry.js';

export const Injectable = (): ((ctor: Ctor) => void) =>
    (ctor: Ctor): void => {
        const params: readonly Token[] =
            (Reflect.getMetadata('design:paramtypes', ctor) as Token[] | undefined) ?? [];
        registerDeps(ctor, params);
    };
