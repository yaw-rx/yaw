import type { SSGStateBlob } from '../types.js';

let hydrateBlob: SSGStateBlob | undefined;

export const setHydrateBlob = (blob: SSGStateBlob): void => { hydrateBlob = blob; };
export const getHydrateBlob = (): SSGStateBlob | undefined => hydrateBlob;
