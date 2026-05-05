import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'stat-counter',
    template: `<div class="stat"><span class="value"><span class="digits">{{count}}</span><span class="unit">{{unit}}</span></span><span class="label">{{label}}</span></div>`,
    styles: `
        :host { display: block; }
        .stat { text-align: center; }
        .value { display: block; font-size: 3.5rem; font-weight: 900; color: var(--white);
                 letter-spacing: -2px; line-height: 1; font-variant-numeric: tabular-nums;
                 white-space: nowrap; }
        .digits { display: inline-block; text-align: right; min-width: var(--dw); }
        .unit { font-size: 0.75rem; font-weight: 600; color: var(--muted-alt); letter-spacing: 0.02em; margin-left: 0.4em; }
        .label { display: block; font-size: 0.75rem; color: var(--muted-alt); letter-spacing: 0.1em;
                 font-family: var(--font-mono); margin-top: 0.5rem; font-weight: 600;
                 letter-spacing: 0.04em; word-spacing: -0.35em; }
        @media (max-width: 480px) {
            .value { font-size: 2.5rem; }
            .label { font-size: 0.65rem; }
        }
    `
})
export class StatCounter extends RxElement {
    @state count = 0;
    @state label = '';
    @state unit = '';
    @state target = 0;

    override onInit(): void {
        this.style.setProperty('--dw', `${String(this.target).length}ch`);
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
