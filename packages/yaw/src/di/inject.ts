import type { Token } from './types.js';

const propDepsMap = new Map<Function, Map<string | symbol, Token>>();

export const getPropDeps = (ctor: Function): ReadonlyMap<string | symbol, Token> | undefined =>
    propDepsMap.get(ctor);

export const Inject = (token: Token): PropertyDecorator =>
    (target: object, prop: string | symbol): void => {
        const ctor = target.constructor;
        let map = propDepsMap.get(ctor);
        if (map === undefined) {
            map = new Map();
            propDepsMap.set(ctor, map);
        }
        map.set(prop, token);
    };
