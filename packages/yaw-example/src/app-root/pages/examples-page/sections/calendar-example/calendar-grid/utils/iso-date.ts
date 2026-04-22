const pad = (n: number): string => String(n).padStart(2, '0');

export const isoDate = (year: number, month: number, day: number): string =>
    `${String(year)}-${pad(month + 1)}-${pad(day)}`;
