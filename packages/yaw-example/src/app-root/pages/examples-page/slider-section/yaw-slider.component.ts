import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { html, css, ts } from '@yaw-rx/common/tags';

export const SLIDER_TEMPLATE = html`
    <div class="track"
         onpointerdown="grab($event)"
         onpointermove="drag($event)"
         onpointerup="release($event)">
        <div class="fill" [style]="fillStyle"></div>
        <div class="thumb" [style]="thumbStyle"></div>
    </div>
`;

const styles = css`
    :host { display: block; padding: 0.5rem 0.6rem; }
    .track { position: relative; height: 0.5rem; background: var(--bg-5);
             border: var(--border-width) solid var(--bg-6); border-radius: 1rem;
             cursor: pointer; touch-action: none; user-select: none; }
    .fill { position: absolute; top: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, #557 0%, var(--accent) 100%);
            border-radius: 1rem; pointer-events: none; }
    .thumb { position: absolute; top: 50%;
             width: 1.2rem; height: 1.2rem;
             background: var(--white); border: 2px solid var(--accent); border-radius: 50%;
             transform: translate(-50%, -50%);
             box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 55%, transparent);
             pointer-events: none;
             transition: box-shadow 0.15s ease; }
    .track:active .thumb { box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 90%, transparent); }
`;

export const SLIDER_SOURCE = ts`@Component({
    selector: 'yaw-slider',
    template: \`${SLIDER_TEMPLATE}\`,
    styles: \`${styles}\`,
})
export class YawSlider extends RxElement {
    @state value = 0;
    @state min = 0;
    @state max = 100;

    grab(e: PointerEvent): void {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        this.apply(e);
    }
    drag(e: PointerEvent): void {
        if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) this.apply(e);
    }
    release(e: PointerEvent): void {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }

    private apply(e: PointerEvent): void {
        const rect = (e.currentTarget as Element).getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.value = Math.round(this.min + pct * (this.max - this.min));
    }

    private ratio(v: number): number { return (v - this.min) / (this.max - this.min); }
    get fillStyle$(): Observable<string>  { return this.value$.pipe(map((v) => \`width: \${this.ratio(v) * 100}%\`)); }
    get thumbStyle$(): Observable<string> { return this.value$.pipe(map((v) => \`left: \${this.ratio(v) * 100}%\`)); }
}`;

@Component({
    selector: 'yaw-slider',
    template: SLIDER_TEMPLATE,
    styles,
})
export class YawSlider extends RxElement {
    @state value = 0;
    @state min = 0;
    @state max = 100;

    grab(e: PointerEvent): void {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        this.apply(e);
    }

    drag(e: PointerEvent): void {
        if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) this.apply(e);
    }

    release(e: PointerEvent): void {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    }

    private apply(e: PointerEvent): void {
        const rect = (e.currentTarget as Element).getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.value = Math.round(this.min + pct * (this.max - this.min));
    }

    private ratio(v: number): number { return (v - this.min) / (this.max - this.min); }
    get fillStyle$(): Observable<string>  { return this.value$.pipe(map((v) => `width: ${String(this.ratio(v) * 100)}%`)); }
    get thumbStyle$(): Observable<string> { return this.value$.pipe(map((v) => `left: ${String(this.ratio(v) * 100)}%`)); }
}
