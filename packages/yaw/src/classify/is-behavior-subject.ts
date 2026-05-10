import { BehaviorSubject } from 'rxjs';

/**
 * Type guard for BehaviorSubject — any observable with synchronous `.value`.
 *
 * Catches both plain BehaviorSubjects and StateSubjects (which extend it).
 * Used during stamping resolution to read the current value directly
 * without subscribing. `instanceof` check — O(1).
 *
 * @param obj - The value to classify.
 * @returns {boolean} `true` if `obj` is a BehaviorSubject.
 */
export const isBehaviorSubject = (obj: unknown): obj is BehaviorSubject<unknown> =>
    obj instanceof BehaviorSubject;
