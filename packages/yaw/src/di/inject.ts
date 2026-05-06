import type { Token } from './types.js';

const injectMetadataMap = new Map<Function, Map<string | symbol, Token>>();

export const getInjectMetadata = (ctor: Function): ReadonlyMap<string | symbol, Token> | undefined =>
    injectMetadataMap.get(ctor);

/**
 * Field decorator that marks a property for dependency injection.
 * During component initialization, the injector resolves the token
 * and assigns the instance to the decorated field.
 * @param {Token} token - The DI token to resolve (a class constructor or symbol).
 * @returns {(value: undefined, context: ClassFieldDecoratorContext) => void} The decorator function.
 */
export const Inject = (token: Token) =>
    (_value: undefined, context: ClassFieldDecoratorContext): void => {
        context.addInitializer(function () {
            const ctor = (this as object).constructor;
            let map = injectMetadataMap.get(ctor);
            if (map === undefined) { map = new Map(); injectMetadataMap.set(ctor, map); }
            map.set(context.name, token);
        });
    };
