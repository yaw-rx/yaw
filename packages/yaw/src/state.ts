import { BehaviorSubject } from 'rxjs';
import { getComponentHydrateState } from './ssg/hydrate/get-component-hydrate-state.js';
import { getServiceHydrateState } from './ssg/hydrate/get-service-hydrate-state.js';
import { decodeAttribute } from './attribute-codec/decode.js';

export class StateSubject<T> extends BehaviorSubject<T> {
    touch(): void {
        this.next(this.value);
    }
}

const subjects = new WeakMap<object, Map<string, StateSubject<unknown>>>();
const observableKeys = new WeakMap<object, Set<string>>();

const hydrateCache = new WeakMap<object, Record<string, unknown>>();

const getHydrateState = (instance: object): Record<string, unknown> | undefined => {
    if (hydrateCache.has(instance)) return hydrateCache.get(instance);
    let state: Record<string, unknown> | undefined;
    if (instance instanceof HTMLElement) {
        const ssgId = instance.getAttribute('data-ssg-id');
        if (ssgId !== null) state = getComponentHydrateState(ssgId);
    } else {
        state = getServiceHydrateState(instance.constructor.name);
    }
    if (state !== undefined) hydrateCache.set(instance, state);
    return state;
};

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

const bagFor = (instance: object): Map<string, StateSubject<unknown>> => {
    let bag = subjects.get(instance);
    if (bag === undefined) {
        bag = new Map();
        subjects.set(instance, bag);
    }
    return bag;
};

export const getSubject = (instance: object, key: string): BehaviorSubject<unknown> | undefined =>
    subjects.get(instance)?.get(key);

const getStateTypeName = (ctor: Function, key: string): string | undefined => {
    const map = (ctor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
    return map?.[key];
};

const parseRaw = (current: unknown, raw: string): unknown => {
    if (typeof current === 'number') return Number(raw);
    if (typeof current === 'boolean') return raw !== 'false';
    return raw;
};

export const state = <This extends object, V>(
    target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> => {
    const key = String(context.name);

    context.addInitializer(function (this: This) {
        trackKey(Object.getPrototypeOf(this) as object, key);

        const declaredDefault = target.get.call(this);
        let initial: unknown = declaredDefault;
        const typeName = getStateTypeName(this.constructor, key);

        const hs = getHydrateState(this as object);
        if (hs?.[key] !== undefined) {
            initial = typeName !== undefined
                ? decodeAttribute(typeName, key, hs[key] as string)
                : hs[key];
            target.set.call(this, initial as V);
        }

        if (this instanceof HTMLElement) {
            const raw = this.getAttribute(key);
            if (raw !== null) {
                initial = typeName !== undefined
                    ? decodeAttribute(typeName, key, raw)
                    : parseRaw(declaredDefault, raw);
                target.set.call(this, initial as V);
            }
        }

        bagFor(this as object).set(key, new StateSubject<unknown>(initial));

        Object.defineProperty(this, `${key}$`, {
            value: bagFor(this as object).get(key)!,
            enumerable: false,
            configurable: true,
        });
    });

    return {
        get(this: This): V {
            const bs = subjects.get(this as object)?.get(key);
            return bs !== undefined ? bs.value as V : target.get.call(this);
        },
        set(this: This, v: V): void {
            const prev = target.get.call(this);
            if (typeof v !== 'object' && Object.is(prev, v)) return;
            target.set.call(this, v);
            const bs = subjects.get(this as object)?.get(key);
            if (bs !== undefined) bs.next(v);
        },
    };
};
