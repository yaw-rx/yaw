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
