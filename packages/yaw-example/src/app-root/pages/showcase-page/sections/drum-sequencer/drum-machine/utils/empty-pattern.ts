import { STEPS } from '../consts.js';

export const emptyPattern = (): readonly boolean[] =>
    Array.from({ length: STEPS }, () => false);
