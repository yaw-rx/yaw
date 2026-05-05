import { STEPS } from '../consts.js';
import { emptyPattern } from './empty-pattern.js';

export const defaultPattern = (voice: string): readonly boolean[] => {
    const p = emptyPattern() as boolean[];
    if (voice === 'kik') { p[0] = true; p[4] = true; p[8] = true; p[12] = true; }
    else if (voice === 'snr') { p[4] = true; p[12] = true; }
    else if (voice === 'hat') { for (let i = 0; i < STEPS; i += 2) p[i] = true; }
    else if (voice === 'clp') { p[4] = true; p[12] = true; }
    return p;
};
