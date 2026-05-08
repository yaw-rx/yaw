import { firstValueFrom } from 'rxjs';
import { isBehaviorSubject } from '../classify/is-behavior-subject.js';
import { isObservable } from '../classify/is-observable.js';
import { isPromise } from '../classify/is-promise.js';
import type { StampInstruction } from './analyse.js';

/**
 * Source classification for a single stamp instruction.
 * Per-item: value varies per item, segments are the property path
 * on the item data. Shared: value is the same for all items,
 * already resolved to a root object with remaining segments.
 */
export type StampSource =
    | { readonly kind: 'item'; readonly segments: readonly string[] }
    | { readonly kind: 'index' }
    | { readonly kind: 'shared'; readonly root: unknown; readonly segments: readonly string[] };

/**
 * Classifies a stamp instruction's binding path against a scope.
 * Returns a StampSource describing where the value comes from.
 * Provided by the directive (e.g. rx-for) that owns the scope.
 */
export type ScopeClassifier = (instruction: StampInstruction) => StampSource;

/**
 * Classify a raw value via the type classifiers. BehaviorSubject
 * reads .value, Observable defers via firstValueFrom, Promise
 * passes through, plain value returns directly.
 *
 * @param raw - The value to classify.
 * @returns {unknown} Resolved value or Promise.
 */
const classify = (raw: unknown): unknown => {
    if (isBehaviorSubject(raw)) return raw.value;
    if (isObservable(raw)) return firstValueFrom(raw);
    if (isPromise(raw)) return raw;
    return raw;
};

/**
 * Walk a property path on a root object, classifying at each step.
 *
 * @param root - The object to start from.
 * @param segments - The property path to walk.
 * @returns {unknown} The resolved value or Promise.
 */
const walkPath = (root: unknown, segments: readonly string[]): unknown => {
    let cur = root;
    for (const seg of segments) {
        cur = classify(cur);
        if (cur instanceof Promise) {
            return cur.then((resolved) => walkPath(resolved, segments.slice(segments.indexOf(seg))));
        }
        if (cur === null || cur === undefined) return undefined;
        const obj = cur as Record<string, unknown>;
        let raw = obj[seg];
        if (raw === undefined || raw === null) {
            const reactive = obj[`${seg}$`];
            if (reactive !== undefined) raw = reactive;
        }
        cur = raw;
    }
    return classify(cur);
};

/**
 * Resolve all stamp values in a single pass.
 *
 * Takes the stamp instructions, N items, and a scope classifier.
 * Classifies each instruction as per-item or shared. Shared values
 * are resolved once and reused across all N items. Per-item values
 * are resolved per item. All async values (shared and per-item)
 * are batched into a single Promise.all.
 *
 * Returns a flat array of N * K values in row-major order:
 * [item0_inst0, item0_inst1, ..., item0_instK, item1_inst0, ...].
 * Ready to feed writeStamp per clone by slicing at K offsets.
 *
 * @param instructions - Stamp instructions from analyseTemplate.
 * @param items - The array of item data.
 * @param classifier - Classifies each instruction's binding source.
 * @returns {unknown[] | Promise<unknown[]>} Flat resolved values.
 */
export const resolveStamp = (
    instructions: readonly StampInstruction[],
    items: readonly unknown[],
    classifier: ScopeClassifier,
): unknown[] | Promise<unknown[]> => {
    const K = instructions.length;
    const N = items.length;
    const total = N * K;
    const out: unknown[] = new Array(total);
    let pending = 0;

    const sources = new Array<StampSource>(K);
    const shared = new Array<unknown>(K);

    for (let k = 0; k < K; k++) {
        const src = classifier(instructions[k]!);
        sources[k] = src;

        if (src.kind === 'shared') {
            shared[k] = walkPath(src.root, src.segments);
        }
    }

    for (let i = 0; i < N; i++) {
        const base = i * K;
        const item = items[i];

        for (let k = 0; k < K; k++) {
            const src = sources[k]!;
            let val: unknown;

            if (src.kind === 'shared') {
                val = shared[k];
            } else if (src.kind === 'index') {
                val = i;
                out[base + k] = val;
                continue;
            } else {
                val = walkPath(item, src.segments);
            }

            if (val instanceof Promise) {
                pending++;
            }
            out[base + k] = val;
        }
    }

    if (pending === 0) return out;

    const indices: number[] = [];
    const promises: Promise<unknown>[] = [];
    for (let j = 0; j < total; j++) {
        if (out[j] instanceof Promise) {
            indices.push(j);
            promises.push(out[j] as Promise<unknown>);
        }
    }
    return Promise.all(promises).then((resolved) => {
        for (let j = 0; j < resolved.length; j++) {
            out[indices[j]!] = resolved[j];
        }
        return out;
    });
};
