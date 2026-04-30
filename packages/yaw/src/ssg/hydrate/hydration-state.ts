import { ReplaySubject } from 'rxjs';

let hydrating = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;
export const isHydrating = (): boolean => hydrating;

export const hydrationComplete$ = new ReplaySubject<void>(1);
export const setHydrating = (value: boolean): void => {
    hydrating = value;
    if (!value) hydrationComplete$.next();
};
