import { type Subscription } from 'rxjs';
import { registerConnectHook, type RxElementLike } from './registry.js';

export function Implements<T>() {
    return <U extends T>(target: U): U => target;
}

export interface AttributeParser<T> {
    (expr: string, parent: RxElementLike, update: (value: T) => void): Subscription[];
}

export const DefinesAttribute = <T>() => <N extends string>(name: N, parser: AttributeParser<T>) => {
    registerConnectHook((el: RxElementLike, parent: RxElementLike | undefined): readonly Subscription[] => {
        const expr = el.getAttribute(name);
        if (expr === null || parent === undefined) return [];

        const handler = (el as unknown as Record<string, unknown>)[name];
        if (typeof handler !== 'function') return [];

        return parser(expr, parent, (value) => { handler.call(el, value); });
    });
    return <U extends Record<N, (value: T) => void>>(_target: U): void => {};
};
