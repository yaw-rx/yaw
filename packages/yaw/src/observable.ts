import { BehaviorSubject } from 'rxjs';

export type Observables<S> = {
    readonly [K in keyof S & string as `${K}$`]: BehaviorSubject<S[K]>;
};

const subjects = new WeakMap<object, Map<string | symbol, BehaviorSubject<unknown>>>();
const observableKeys = new WeakMap<object, Set<string>>();

const trackKey = (proto: object, key: string): void => {
    let keys = observableKeys.get(proto);
    if (keys === undefined) {
        keys = new Set();
        observableKeys.set(proto, keys);
    }
    keys.add(key);
};

export const getObservableKeys = (proto: object): ReadonlySet<string> => {
    let all: Set<string> | undefined;
    let cur: object | null = proto;
    while (cur !== null && cur !== Object.prototype) {
        const keys = observableKeys.get(cur);
        if (keys !== undefined) {
            if (all === undefined) all = new Set(keys);
            else for (const k of keys) all.add(k);
        }
        cur = Object.getPrototypeOf(cur) as object | null;
    }
    return all ?? new Set();
};

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

export const getSubject = (instance: object, key: string): BehaviorSubject<unknown> | undefined =>
    subjects.get(instance)?.get(key);

export const observable = (target: object, propertyKey: string | symbol): void => {
    if (typeof propertyKey === 'string') trackKey(target, propertyKey);

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
