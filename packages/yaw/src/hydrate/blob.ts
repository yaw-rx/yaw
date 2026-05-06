import type { HydrationStateBlob } from './types.js';

let hydrationStateBlob: HydrationStateBlob | undefined;

export const setHydrationStateBlob = (blob: HydrationStateBlob): void => { hydrationStateBlob = blob; };
export const getHydrationStateBlob = (): HydrationStateBlob | undefined => hydrationStateBlob;
