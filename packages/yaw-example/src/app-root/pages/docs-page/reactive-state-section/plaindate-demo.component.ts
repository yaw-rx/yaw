import { type AttributeCodec, Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'plaindate-demo',
    attributeCodecs: {
        PlainDate: {
            encode: (v) => (v as Temporal.PlainDate).toString(),
            decode: (s) => Temporal.PlainDate.from(s),
        } as AttributeCodec,
    },
    template: `
        <div class="panel">
            <div class="row">
                <span class="label">PlainDate</span>
                <code class="value">{{birthday}}</code>
            </div>
            <div class="buttons">
                <button onclick="nextDay">+ day</button>
                <button onclick="nextMonth">+ month</button>
                <button onclick="nextYear">+ year</button>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .panel { display: flex; flex-direction: column; gap: 0.75rem; }
        .row { display: flex; align-items: center; gap: 0.75rem;
               justify-content: space-between; flex-wrap: wrap; }
        .label { color: var(--secondary); font-family: var(--font-mono); font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: var(--tracking); }
        .value { color: var(--accent); font-family: var(--font-mono); font-size: 1rem;
                 background: var(--bg-2); padding: 0.35rem 0.7rem;
                 border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-sm); }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: var(--bg-3); border: var(--border-width) solid var(--border); color: var(--white);
                 padding: 0.4rem 0.8rem; font: inherit; font-family: var(--font-mono);
                 font-size: 0.8rem; cursor: pointer; border-radius: var(--radius-sm); }
        button:hover { border-color: var(--accent); color: var(--accent); }
    `,
})
export class PlainDateDemo extends RxElement {
    @state birthday!: Temporal.PlainDate;

    nextDay(): void { this.birthday = this.birthday.add({ days: 1 }); }
    nextMonth(): void { this.birthday = this.birthday.add({ months: 1 }); }
    nextYear(): void { this.birthday = this.birthday.add({ years: 1 }); }
}
