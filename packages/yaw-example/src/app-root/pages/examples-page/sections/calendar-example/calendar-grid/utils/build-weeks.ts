import type { DayCell } from '../types.js';
import type { WeekSeed } from '../types.js';
import { isoDate } from './iso-date.js';

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
