import { Component, RxElement, state } from 'yaw';

@Component({
    selector: 'date-ticker',
    template: `
        <div class="row">
            <span class="label">Date</span>
            <code class="value">{{now}}</code>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .row { display: flex; align-items: center; gap: 0.75rem;
               justify-content: space-between; }
        .label { color: #888; font-family: monospace; font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: 0.08em; }
        .value { color: #8af; font-family: monospace; font-size: 0.85rem;
                 background: #0a0a0a; padding: 0.35rem 0.7rem;
                 border: 1px solid #1a1a1a; border-radius: 4px;
                 overflow: hidden; text-overflow: ellipsis; }
    `,
})
export class DateTicker extends RxElement {
    @state now!: Date;
}
