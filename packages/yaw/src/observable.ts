import { BehaviorSubject } from 'rxjs';

export type Observables<S> = {
    readonly [K in keyof S & string as `${K}$`]: BehaviorSubject<S[K]>;
};

const subjects = new WeakMap<object, Map<string | symbol, BehaviorSubject<unknown>>>();

const bagFor = (instance: object): Map<string | symbol, BehaviorSubject<unknown>> => {
    let bag = subjects.get(instance);
    if (bag === undefined) {
        bag = new Map();
        subjects.set(instance, bag);
    }
    return bag;
};

const ensure = (
    instance: object,
    key: string | symbol,
    initial: unknown,
): BehaviorSubject<unknown> => {
    const bag = bagFor(instance);
    let subject = bag.get(key);
    if (subject === undefined) {
        subject = new BehaviorSubject(initial);
        bag.set(key, subject);
    }
    return subject;
};

export const observable = (target: object, propertyKey: string | symbol): void => {
    Object.defineProperty(target, propertyKey, {
        configurable: true,
        enumerable: true,
        get(this: object): unknown {
            return ensure(this, propertyKey, undefined).value;
        },
        set(this: object, value: unknown) {
            const bag = bagFor(this);
            const existing = bag.get(propertyKey);
            if (existing === undefined) {
                bag.set(propertyKey, new BehaviorSubject(value));
            } else {
                if (existing.value !== value) existing.next(value);
            }
        },
    });

    if (typeof propertyKey === 'string') {
        Object.defineProperty(target, `${propertyKey}$`, {
            configurable: true,
            enumerable: false,
            get(this: object): BehaviorSubject<unknown> {
                return ensure(this, propertyKey, undefined);
            },
        });
    }
};
