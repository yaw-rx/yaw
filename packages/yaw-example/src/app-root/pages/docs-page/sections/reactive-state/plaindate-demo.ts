import { type AttributeCodec, Component, RxElement, state } from 'yaw';

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
        .label { color: #888; font-family: monospace; font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: 0.08em; }
        .value { color: #8af; font-family: monospace; font-size: 1rem;
                 background: #0a0a0a; padding: 0.35rem 0.7rem;
                 border: 1px solid #1a1a1a; border-radius: 4px; }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.4rem 0.8rem; font: inherit; font-family: monospace;
                 font-size: 0.8rem; cursor: pointer; border-radius: 4px; }
        button:hover { border-color: #8af; color: #8af; }
    `,
})
export class PlainDateDemo extends RxElement {
    @state birthday!: Temporal.PlainDate;

    nextDay(): void { this.birthday = this.birthday.add({ days: 1 }); }
    nextMonth(): void { this.birthday = this.birthday.add({ months: 1 }); }
    nextYear(): void { this.birthday = this.birthday.add({ years: 1 }); }
}
