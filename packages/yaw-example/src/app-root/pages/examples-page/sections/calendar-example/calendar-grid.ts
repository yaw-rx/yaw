import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from 'yaw';
import { MONTH_NAMES } from './calendar-grid/consts.js';
import { buildWeeks } from './calendar-grid/utils/build-weeks.js';
import { isoDate } from './calendar-grid/utils/iso-date.js';
import type { WeekSeed } from './calendar-grid/types.js';

@Component({
    selector: 'calendar-grid',
    template: `
        <header class="toolbar">
            <button class="nav" onclick="prevMonth">‹</button>
            <div class="title">{{monthLabel}}</div>
            <button class="nav" onclick="nextMonth">›</button>
            <div class="slot-wrap"><slot name="actions"></slot></div>
        </header>
        <div class="dow">
            <div>Mo</div><div>Tu</div><div>We</div>
            <div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
        </div>
        <div class="weeks" rx-for="weeks by key">
            <calendar-week></calendar-week>
        </div>
    `,
    styles: `
        :host { display: block; background: #050505; border: 1px solid #1a1a1a;
                border-radius: 8px; padding: 1rem; }
        .toolbar { display: flex; align-items: center; gap: 0.5rem;
                   margin-bottom: 0.75rem; padding-bottom: 0.75rem;
                   border-bottom: 1px solid #151515; }
        .title { flex: 1; text-align: center; color: #fff;
                 font-family: monospace; font-size: 0.95rem; font-weight: 700;
                 letter-spacing: 0.05em; }
        .nav { background: transparent; border: 1px solid #222;
               color: #8af; width: 2rem; height: 2rem; border-radius: 4px;
               font: inherit; cursor: pointer; }
        .nav:hover { border-color: #8af; background: rgba(136, 170, 255, 0.08); }
        .slot-wrap { display: flex; gap: 0.4rem; }
        .dow { display: grid; grid-template-columns: repeat(7, 1fr);
               gap: 0.25rem; margin-bottom: 0.5rem; }
        .dow > div { text-align: center; font-family: monospace;
                     color: #555; font-size: 0.7rem; letter-spacing: 0.1em;
                     padding: 0.3rem 0; }
        .weeks { display: flex; flex-direction: column; gap: 0.25rem; }
    `,
})
export class CalendarGrid extends RxElement<{
    currentYear: number;
    currentMonth: number;
    selectedDate: string | null;
}> {
    @state currentYear = new Date().getFullYear();
    @state currentMonth = new Date().getMonth();
    @state selectedDate: string | null = null;

    get weeks$(): Observable<readonly WeekSeed[]> {
        return combineLatest([
            this.currentYear$, this.currentMonth$, this.selectedDate$,
        ]).pipe(
            map(([y, m, sel]) => buildWeeks(y, m, sel)),
        );
    }

    get monthLabel$(): Observable<string> {
        return combineLatest([this.currentYear$, this.currentMonth$]).pipe(
            map(([y, m]) => `${MONTH_NAMES[m]} ${String(y)}`),
        );
    }

    prevMonth(): void {
        if (this.currentMonth === 0) {
            this.currentMonth = 11;
            this.currentYear -= 1;
        } else {
            this.currentMonth -= 1;
        }
    }

    nextMonth(): void {
        if (this.currentMonth === 11) {
            this.currentMonth = 0;
            this.currentYear += 1;
        } else {
            this.currentMonth += 1;
        }
    }

    today(): void {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth();
        this.selectedDate = isoDate(
            now.getFullYear(), now.getMonth(), now.getDate(),
        );
    }

    selectDate(date: string): void {
        this.selectedDate = date;
    }
}
