import type { Ctor, Token } from './types.js';
import { registerTokenDeps } from './registry.js';

/**
 * Class decorator that registers a service's constructor dependencies.
 * When the injector instantiates the class, it resolves each token
 * and passes them as constructor arguments.
 * @param {readonly Token[]} [deps] - Tokens for the constructor parameters, in order. Defaults to empty.
 * @returns {(ctor: Ctor, context: ClassDecoratorContext) => void} The decorator function.
 */
export const Injectable = (deps?: readonly Token[]) =>
    (ctor: Ctor, _context: ClassDecoratorContext): void => {
        registerTokenDeps(ctor, deps ?? []);
    };
