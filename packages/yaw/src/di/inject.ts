import type { Token } from './types.js';

const propDepsMap = new Map<Function, Map<string | symbol, Token>>();

export const getPropDeps = (ctor: Function): ReadonlyMap<string | symbol, Token> | undefined =>
    propDepsMap.get(ctor);

export const Inject = (token: Token) =>
    (_value: undefined, context: ClassFieldDecoratorContext): void => {
        context.addInitializer(function () {
            const ctor = (this as object).constructor;
            let map = propDepsMap.get(ctor);
            if (map === undefined) { map = new Map(); propDepsMap.set(ctor, map); }
            map.set(context.name, token);
        });
    };
