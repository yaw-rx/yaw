import { ReplaySubject } from 'rxjs';

const prerendered = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
let hydrating = prerendered;

/**
 * Returns true if the page was SSG-prerendered (the __yaw_hydrate global was set).
 * @returns {boolean} Whether the page is a prerendered SSG page.
 */
export const isPrerendered = (): boolean => prerendered;

/**
 * Returns true while hydration is in progress. False before hydration
 * starts and after it completes.
 * @returns {boolean} Whether hydration is currently active.
 */
export const isHydrating = (): boolean => hydrating;

/**
 * Emits once when hydration completes. Components and directives that
 * need to defer work until after hydration can subscribe to this.
 */
export const hydrationComplete$ = new ReplaySubject<void>(1);

/**
 * Sets the hydrating flag. When set to false, emits on hydrationComplete$.
 * @param {boolean} value - The new hydrating state.
 * @returns {void}
 */
export const setHydrating = (value: boolean): void => {
    hydrating = value;
    if (!value) hydrationComplete$.next();
};
