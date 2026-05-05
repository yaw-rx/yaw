import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'calendar-day',
    template: `<button onclick="^^selectDate(date)"
                       [class.selected]="selected"
                       [class.in-month]="inMonth">{{day}}</button>`,
    styles: `
        :host { display: block; }
        button { width: 100%; aspect-ratio: 1; background: transparent;
                 border: var(--border-width) solid var(--bg-4); border-radius: var(--radius-sm);
                 color: #3a3a3a; font: inherit; font-family: var(--font-mono);
                 font-size: 0.85rem; cursor: pointer; padding: 0;
                 transition: background 0.08s, border-color 0.08s, color 0.08s; }
        button:hover { border-color: #3a5a88; color: var(--accent); }
        button.in-month { color: #bbb; }
        button.selected { background: var(--accent); border-color: var(--accent);
                          color: var(--black); font-weight: 700;
                          box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 50%, transparent); }
    `,
})
export class CalendarDay extends RxElement {
    @state date = '';
    @state day = 0;
    @state inMonth = false;
    @state selected = false;
}
