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

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const pad = (n: number): string => String(n).padStart(2, '0');

export const isoDate = (year: number, month: number, day: number): string =>
    `${String(year)}-${pad(month + 1)}-${pad(day)}`;

export const buildWeeks = (
    year: number,
    month: number,
    selected: string | null,
): readonly WeekSeed[] => {
    const first = new Date(year, month, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);

    const weeks: WeekSeed[] = [];
    for (let w = 0; w < 6; w++) {
        const days: DayCell[] = [];
        for (let d = 0; d < 7; d++) {
            const cur = new Date(
                start.getFullYear(), start.getMonth(),
                start.getDate() + w * 7 + d,
            );
            const date = isoDate(cur.getFullYear(), cur.getMonth(), cur.getDate());
            days.push({
                key: date,
                date,
                day: cur.getDate(),
                inMonth: cur.getMonth() === month,
                selected: date === selected,
            });
        }
        weeks.push({ key: `w${String(w)}`, weekIdx: w, days });
    }
    return weeks;
};
