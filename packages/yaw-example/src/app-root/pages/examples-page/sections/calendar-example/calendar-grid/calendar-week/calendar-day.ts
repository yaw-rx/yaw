import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'calendar-day',
    template: `<button onclick="^^selectDate(date)"
                       [class.selected]="selected"
                       [class.in-month]="inMonth">{{day}}</button>`,
    styles: `
        :host { display: block; }
        button { width: 100%; aspect-ratio: 1; background: transparent;
                 border: 1px solid #151515; border-radius: 4px;
                 color: #3a3a3a; font: inherit; font-family: monospace;
                 font-size: 0.85rem; cursor: pointer; padding: 0;
                 transition: background 0.08s, border-color 0.08s, color 0.08s; }
        button:hover { border-color: #3a5a88; color: #8af; }
        button.in-month { color: #bbb; }
        button.selected { background: #8af; border-color: #8af;
                          color: #000; font-weight: 700;
                          box-shadow: 0 0 14px rgba(136, 170, 255, 0.5); }
    `,
})
export class CalendarDay extends RxElement {
    @state date = '';
    @state day = 0;
    @state inMonth = false;
    @state selected = false;
}
