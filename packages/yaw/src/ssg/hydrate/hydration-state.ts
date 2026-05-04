import { ReplaySubject } from 'rxjs';

const prerendered = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
let hydrating = prerendered;
export const isPrerendered = (): boolean => prerendered;
export const isHydrating = (): boolean => hydrating;

export const hydrationComplete$ = new ReplaySubject<void>(1);
export const setHydrating = (value: boolean): void => {
    hydrating = value;
    if (!value) hydrationComplete$.next();
};
