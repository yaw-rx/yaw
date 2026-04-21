export const STEPS = 16;

export const VOICES = [
    { key: 'kik', name: 'KIK', accent: '#ff5577' },
    { key: 'snr', name: 'SNR', accent: '#ffaa55' },
    { key: 'hat', name: 'HAT', accent: '#ffff88' },
    { key: 'opn', name: 'OPN', accent: '#88ffaa' },
    { key: 'clp', name: 'CLP', accent: '#55ddff' },
    { key: 'tom', name: 'TOM', accent: '#aa88ff' },
    { key: 'rim', name: 'RIM', accent: '#ff88dd' },
    { key: 'cow', name: 'COW', accent: '#ffffff' },
] as const;

export interface TrackSeed {
    readonly key: string;
    readonly trackKey: string;
    readonly name: string;
    readonly voice: string;
    readonly accent: string;
    readonly steps: readonly boolean[];
}

export interface Cell {
    readonly idx: number;
    readonly on: boolean;
    readonly beat: boolean;
    readonly accent: string;
}

export const emptyPattern = (): readonly boolean[] =>
    Array.from({ length: STEPS }, () => false);

export const defaultPattern = (voice: string): readonly boolean[] => {
    const p = emptyPattern() as boolean[];
    if (voice === 'kik') { p[0] = true; p[4] = true; p[8] = true; p[12] = true; }
    else if (voice === 'snr') { p[4] = true; p[12] = true; }
    else if (voice === 'hat') { for (let i = 0; i < STEPS; i += 2) p[i] = true; }
    else if (voice === 'clp') { p[4] = true; p[12] = true; }
    return p;
};
