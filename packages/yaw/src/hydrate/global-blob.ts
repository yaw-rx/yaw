/**
 * Global SSG state -- per-scope values captured during SSG, delivered
 * as lazy chunks and merged progressively at runtime.
 */
import { type Observable, ReplaySubject } from 'rxjs';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type GlobalSSGStateBlob = Record<string, Record<string, JsonValue>>;

const captured: GlobalSSGStateBlob = {};

const subjects = new Map<string, Map<string, ReplaySubject<JsonValue>>>();

const subjectFor = (scope: string, key: string): ReplaySubject<JsonValue> => {
    let scopeMap = subjects.get(scope);
    if (!scopeMap) {
        scopeMap = new Map();
        subjects.set(scope, scopeMap);
    }
    let subj = scopeMap.get(key);
    if (!subj) {
        subj = new ReplaySubject<JsonValue>(1);
        scopeMap.set(key, subj);
    }
    return subj;
};

/**
 * Stores a value in the global SSG state during capture.
 * Throws if the same scope + key combination has already been set.
 * @param {string} scope - The grouping key for this value.
 * @param {string} key - The property name to store.
 * @param {unknown} value - Any JSON-serializable value.
 * @returns {void}
 */
export const setGlobalSSGState = (scope: string, key: string, value: unknown): void => {
    const bucket = captured[scope] ??= {};
    if (key in bucket) throw new Error(`globalSSGState collision: "${key}" already set for scope "${scope}"`);
    bucket[key] = value as JsonValue;
    subjectFor(scope, key).next(value as JsonValue);
};

/**
 * Returns an observable that emits the value for a scope + key
 * when it becomes available (immediately if already set).
 * @param {string} scope - The grouping key to look up.
 * @param {string} key - The property name to read.
 * @returns {Observable<JsonValue>} Observable that emits when the value is set.
 */
export const getGlobalSSGState = (scope: string, key: string): Observable<JsonValue> =>
    subjectFor(scope, key).asObservable();

/**
 * Merges an entire scope's data into the blob.
 * Called by chunk scripts loaded via modulepreload.
 * @param {string} scope - The scope to merge.
 * @param {Record<string, unknown>} data - The key/value pairs to merge.
 * @returns {void}
 */
export const mergeGlobalSSGStateScope = (scope: string, data: Record<string, unknown>): void => {
    const bucket = captured[scope] ??= {};
    for (const [key, value] of Object.entries(data)) {
        if (key in bucket) throw new Error(`globalSSGState collision: "${key}" already set for scope "${scope}"`);
        bucket[key] = value as JsonValue;
        subjectFor(scope, key).next(value as JsonValue);
    }
};

/**
 * Serializes all captured global SSG state to a JSON string.
 * Called by the SSG after all pages have been captured.
 * @returns {string} The serialized state.
 */
export const serializeGlobalSSGState = (): string => JSON.stringify(captured);

(globalThis as Record<string, unknown>)['__yaw_global_merge'] = mergeGlobalSSGStateScope;
