import { Component, RxElement, observable } from 'yaw';

@Component({
    selector: 'stat-counter',
    template: `<div class="stat"><span class="value">{{count}}</span><span class="label">{{label}}</span></div>`,
    styles: `
        :host { display: block; }
        .stat { text-align: center; }
        .value { display: block; font-size: 3.5rem; font-weight: 900; color: #fff;
                 letter-spacing: -2px; line-height: 1; font-variant-numeric: tabular-nums; }
        .label { display: block; font-size: 0.75rem; color: #555; letter-spacing: 0.1em;
                 text-transform: uppercase; margin-top: 0.5rem; }
    `
})
export class StatCounter extends RxElement<{ count: number; label: string }> {
    @observable count = 0;
    @observable label = '';
    private target = 0;

    override onInit(): void {
        this.target = parseInt(this.getAttribute('target') ?? '0', 10);
        this.label = this.getAttribute('label') ?? '';
        this.runAnimation();
    }

    private runAnimation(): void {
        const duration = 1500;
        const start = performance.now();
        const tick = (now: number): void => {
            const progress = Math.min((now - start) / duration, 1);
            this.count = Math.round(progress * this.target);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
}
