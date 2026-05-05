export interface DayCell {
    readonly key: string;
    readonly date: string;
    readonly day: number;
    readonly inMonth: boolean;
    readonly selected: boolean;
}

export interface WeekSeed {
    readonly key: string;
    readonly weekIdx: number;
    readonly days: readonly DayCell[];
}
