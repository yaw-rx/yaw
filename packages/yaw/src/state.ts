/**
 * state.ts - the @state decorator and reactive property infrastructure.
 *
 * Authors write `@state foo = 0`. The yaw-transformer plugin injects
 * `accessor` before the property name at compile time, turning it into
 * a TC39 auto-accessor. This decorator then receives the accessor's
 * get/set target and wraps it.
 *
 * Two WeakMaps hold per-instance state:
 *   - `subjects`: maps each instance to a Map<string, StateSubject>.
 *     One StateSubject per @state field, keyed by property name.
 *   - `stateKeys`: maps each prototype to the Set of @state property
 *     names declared on it. Used by the SSG serializer (getStateKeys
 *     walks the prototype chain to collect inherited keys).
 *
 * During the addInitializer callback (runs at instance construction):
 *   1. The property name is registered in stateKeys.
 *   2. The initial value is resolved: getAttribute(key) overrides the
 *      hydration blob, which overrides the declared default. Both
 *      attribute and blob values are decoded via the attribute codec
 *      if a __stateTypes entry exists for the key.
 *   3. A StateSubject is created with the resolved initial value and
 *      stored in subjects.
 *   4. A non-enumerable `foo$` property is defined on the instance,
 *      pointing to the subject.
 *
 * The returned accessor result intercepts get (returns subject.value)
 * and set (calls target.set then subject.next, with Object.is
 * equality check for primitives to suppress no-op emissions).
 */
import { BehaviorSubject } from 'rxjs';
import { getComponentHydrationState, getServiceHydrationState } from './hydrate/resolve.js';
import { decodeAttribute } from './attribute-codec/decode.js';

/**
 * A BehaviorSubject that backs each `@state` field. One per field per
 * instance, keyed by property name in the `subjects` WeakMap.
 * @template T - The type of the state value.
 */
export class StateSubject<T> extends BehaviorSubject<T> {
    /**
     * Re-emits the current value. Use when a mutation has changed
     * the contents of the value without replacing the reference.
     * @returns {void}
     */
    touch(): void {
        this.next(this.value);
    }
}

const subjects = new WeakMap<object, Map<string, StateSubject<unknown>>>();
const stateKeys = new WeakMap<object, Set<string>>();

const hydrationCache = new WeakMap<object, Record<string, unknown>>();

const getHydrationState = (instance: object): Record<string, unknown> | undefined => {
    if (hydrationCache.has(instance)) return hydrationCache.get(instance);
    let state: Record<string, unknown> | undefined;
    if (instance instanceof HTMLElement) {
        const ssgId = instance.getAttribute('data-ssg-id');
        if (ssgId !== null) state = getComponentHydrationState(ssgId);
    } else {
        state = getServiceHydrationState(instance.constructor.name);
    }
    if (state !== undefined) hydrationCache.set(instance, state);
    return state;
};

const addStateKey = (proto: object, key: string): void => {
    let keys = stateKeys.get(proto);
    if (keys === undefined) {
        keys = new Set();
        stateKeys.set(proto, keys);
    }
    keys.add(key);
};

export const getStateKeys = (proto: object): ReadonlySet<string> => {
    let all: Set<string> | undefined;
    let cur: object | null = proto;
    while (cur !== null && cur !== Object.prototype) {
        const keys = stateKeys.get(cur);
        if (keys !== undefined) {
            if (all === undefined) all = new Set(keys);
            else for (const k of keys) all.add(k);
        }
        cur = Object.getPrototypeOf(cur) as object | null;
    }
    return all ?? new Set();
};

const subjectsFor = (instance: object): Map<string, StateSubject<unknown>> => {
    let map = subjects.get(instance);
    if (map === undefined) {
        map = new Map();
        subjects.set(instance, map);
    }
    return map;
};

export const getSubject = (instance: object, key: string): BehaviorSubject<unknown> | undefined =>
    subjects.get(instance)?.get(key);

const getStateTypeName = (ctor: Function, key: string): string | undefined => {
    const map = (ctor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
    return map?.[key];
};

const coerceAttributeValue = (current: unknown, raw: string): unknown => {
    if (typeof current === 'number') return Number(raw);
    if (typeof current === 'boolean') return raw !== 'false';
    return raw;
};

/**
 * TC39 auto-accessor decorator for reactive state fields.
 * The yaw-transformer plugin injects `accessor` at compile time;
 * this decorator wraps the get/set target with a StateSubject.
 *
 * @template This - The class instance type.
 * @template V - The type of the decorated field.
 * @param {ClassAccessorDecoratorTarget<This, V>} target - The accessor's get/set pair.
 * @param {ClassAccessorDecoratorContext<This, V>} context - Decorator context with name and addInitializer.
 * @returns {ClassAccessorDecoratorResult<This, V>} Wrapped get/set that reads from and writes to the StateSubject.
 */
export const state = <This extends object, V>(
    target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> => {
    const key = String(context.name);

    context.addInitializer(function (this: This) {
        addStateKey(Object.getPrototypeOf(this) as object, key);

        const declaredDefault = target.get.call(this);
        let initial: unknown = declaredDefault;
        const typeName = getStateTypeName(this.constructor, key);

        const hs = getHydrationState(this as object);
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
                    : coerceAttributeValue(declaredDefault, raw);
                target.set.call(this, initial as V);
            }
        }

        subjectsFor(this as object).set(key, new StateSubject<unknown>(initial));

        Object.defineProperty(this, `${key}$`, {
            value: subjectsFor(this as object).get(key)!,
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
