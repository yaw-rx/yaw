import dayjs, { type Dayjs } from 'dayjs';
import { map, type Observable } from 'rxjs';
import { type AttributeCodec, Component, RxElement, state } from 'yaw';

@Component({
    selector: 'dayjs-demo',
    attributeCodecs: {
        Dayjs: {
            encode: (v) => (v as Dayjs).toISOString(),
            decode: (s) => dayjs(s),
        } as AttributeCodec,
    },
    template: `
        <div class="panel">
            <div class="row">
                <span class="label">Dayjs</span>
                <code class="value">{{due}}</code>
            </div>
            <div class="row">
                <span class="label">relative</span>
                <code class="value hint">{{relative}}</code>
            </div>
            <div class="buttons">
                <button onclick="addWeek">+ week</button>
                <button onclick="addMonth">+ month</button>
                <button onclick="today">today</button>
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
        .value { color: #8af; font-family: monospace; font-size: 0.85rem;
                 background: #0a0a0a; padding: 0.35rem 0.7rem;
                 border: 1px solid #1a1a1a; border-radius: 4px; }
        .hint { color: #5a5; }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.4rem 0.8rem; font: inherit; font-family: monospace;
                 font-size: 0.8rem; cursor: pointer; border-radius: 4px; }
        button:hover { border-color: #8af; color: #8af; }
    `,
})
export class DayjsDemo extends RxElement {
    @state due!: Dayjs;

    get relative(): Observable<string> {
        return this.due$.pipe(map((d) => {
            const diff = d.diff(dayjs(), 'day');
            if (diff === 0) return 'today';
            if (diff > 0) return `in ${diff} days`;
            return `${Math.abs(diff)} days ago`;
        }));
    }

    addWeek(): void { this.due = this.due.add(7, 'day'); }
    addMonth(): void { this.due = this.due.add(1, 'month'); }
    today(): void { this.due = dayjs(); }
}
