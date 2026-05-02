import { combineLatest, map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';

export const COLOR_PLAYGROUND_TEMPLATE = `
    <label>H <em>{{hue}}°</em></label>
    <yaw-slider [(value)]="hue" min="0" max="360"></yaw-slider>

    <label>S <em>{{sat}}%</em></label>
    <yaw-slider [(value)]="sat" min="0" max="100"></yaw-slider>

    <label>L <em>{{lit}}%</em></label>
    <yaw-slider [(value)]="lit" min="0" max="100"></yaw-slider>

    <code class="out">{{css}}</code>
    <div class="swatch" [style]="swatchStyle"></div>
`;

export const COLOR_PLAYGROUND_STYLES = `
    :host { display: grid; grid-template-columns: auto 1fr;
            gap: 0.75rem 1rem; align-items: center; }
    label { color: #888; font-size: 0.8rem;
            font-family: monospace; text-transform: uppercase;
            letter-spacing: 0.08em; }
    em { color: #8af; font-style: normal;
         display: inline-block; width: 4ch; text-align: right; }
    .out { grid-column: 1 / -1; background: #0a0a0a; padding: 0.6rem 0.75rem;
           border-radius: 4px; color: #8af; font-family: monospace;
           font-size: 0.8rem; border: 1px solid #1a1a1a; }
    .swatch { grid-column: 1 / -1; border-radius: 8px; border: 1px solid #1a1a1a;
              min-height: 6rem; box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.35);
              transition: background 0.1s linear; }
`;

export const COLOR_PLAYGROUND_SOURCE = `@Component({
    selector: 'color-playground',
    template: \`${COLOR_PLAYGROUND_TEMPLATE}\`,
    styles: \`${COLOR_PLAYGROUND_STYLES}\`,
})
export class ColorPlayground extends RxElement {
    @state hue = 200;
    @state sat = 70;
    @state lit = 55;

    get css$(): Observable<string> {
        return combineLatest([this.hue$, this.sat$, this.lit$]).pipe(
            map(([h, s, l]) => \`hsl(\${h} \${s}% \${l}%)\`)
        );
    }

    get swatchStyle$(): Observable<string> {
        return this.css$.pipe(map((c) => \`background: \${c}\`));
    }
}`;

@Component({
    selector: 'color-playground',
    template: COLOR_PLAYGROUND_TEMPLATE,
    styles: COLOR_PLAYGROUND_STYLES,
})
export class ColorPlayground extends RxElement {
    @state hue = 200;
    @state sat = 70;
    @state lit = 55;

    get css$(): Observable<string> {
        return combineLatest([this.hue$, this.sat$, this.lit$]).pipe(
            map(([h, s, l]) => `hsl(${String(h)} ${String(s)}% ${String(l)}%)`)
        );
    }

    get swatchStyle$(): Observable<string> {
        return this.css$.pipe(map((c) => `background: ${c}`));
    }
}
