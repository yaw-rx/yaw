import { map } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'page-echo',
    template: `
        <div class="echo" [class.blended]="blend">
            <div class="section">
                <div class="label">child template — caret prefix reaches the parent host</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">^count</span> {{ ^count }}</code>
                        <span class="sep">·</span>
                        <code><span class="pre">^status</span> {{ ^status }}</code>
                    </div>
                    <div class="row">
                        <button onclick="^increment(2)">^increment(2)</button>
                        <button onclick="^reset">^reset</button>
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="label">local <code class="inline">accent</code> state pushes to the host via tap binding</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">accent</span> {{ accent }}</code>
                    </div>
                    <div class="row">
                        <button onclick="cycleAccent" [style]="accentBtnStyle">accent</button>
                    </div>
                </div>
            </div>
            <div class="section">
                <div class="label">local <code class="inline">blend</code> state — stays in this component, never leaves</div>
                <div class="body">
                    <div class="row">
                        <code><span class="pre">blend</span> {{ blend }}</code>
                    </div>
                    <div class="row">
                        <button onclick="toggleBlend" [class.active]="blend">blend</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; }
        .echo { background: #0a1128; border: var(--border-width) solid var(--navy); border-radius: var(--radius);
                padding: 1rem; color: var(--accent); font-family: var(--font-mono); font-size: 0.85rem; }
        .section + .section { margin-top: 1rem; }
        .label { color: var(--slate); font-size: 0.7rem; letter-spacing: var(--tracking);
                 text-transform: uppercase; margin-bottom: 0.5rem; }
        .label code { color: var(--accent); font-size: inherit; }
        .body { display: flex; flex-direction: column; gap: 0.4rem;
                padding: 0.5rem 0.6rem; background: var(--bg-1);
                border-radius: var(--radius-sm); }
        .row { display: flex; gap: 0.5rem; align-items: center; }
        .row code { color: var(--accent); background: transparent; padding: 0.35rem 0.4rem; }
        .pre { color: var(--slate); }
        .sep { color: #334; }
        .row button { background: #0f1a3a; border: var(--border-width) solid var(--navy); color: var(--accent);
                      padding: 0.35rem 0.7rem; font: inherit; font-size: 0.8rem;
                      cursor: pointer; border-radius: var(--radius-sm); }
        .row button:hover { background: #182555; color: var(--white); }
        .row button.active { background: var(--navy); border-color: var(--accent); color: var(--white); }
        .echo.blended { mix-blend-mode: difference; }
    `
})
export class PageEcho extends RxElement {
    @state accent = '#050505';
    @state blend = false;

    private readonly accents = ['#050505', '#0f2538', '#250f28', '#0f2510', '#25200f', '#280f0f', '#0f0f28'];

    private lighten(hex: string, amount: number): string {
        const c = (o: number) => Math.min(255, parseInt(hex.slice(o, o + 2), 16) + amount);
        return `rgb(${c(1)},${c(3)},${c(5)})`;
    }

    private contrastColor(hex: string, amount: number): string {
        const ch = (o: number) => Math.min(255, parseInt(hex.slice(o, o + 2), 16) + amount);
        const lum = (0.299 * ch(1) + 0.587 * ch(3) + 0.114 * ch(5)) / 255;
        return lum > 0.5 ? '#050505' : '#f5f5f5';
    }

    get accentBtnStyle$() {
        return this.accent$.pipe(
            map((a) => ({ accent: a, bg: this.lighten(a, 70), fg: this.contrastColor(a, 70) })),
            map(({ accent, bg, fg }) => `border-color: ${accent}; color: ${fg}; background: ${bg}`),
        );
    }

    cycleAccent(): void {
        const i = this.accents.indexOf(this.accent);
        this.accent = this.accents[(i + 1) % this.accents.length]!;
    }

    toggleBlend(): void {
        this.blend = !this.blend;
    }
}
