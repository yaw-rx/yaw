import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import type { DayCell } from './types.js';

@Component({
    selector: 'calendar-week',
    template: `
        <div class="days" rx-for="days by key">
            <calendar-day></calendar-day>
        </div>
    `,
    styles: `
        :host { display: block; }
        .days { display: grid; grid-template-columns: repeat(7, 1fr);
                gap: 0.25rem; }
    `,
})
export class CalendarWeek extends RxElement<{
    weekIdx: number;
    days: readonly DayCell[];
}> {
    @observable weekIdx = 0;
    @observable days: readonly DayCell[] = [];
}
