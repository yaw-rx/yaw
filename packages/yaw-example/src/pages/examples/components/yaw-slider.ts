import 'reflect-metadata';
import { map, type BehaviorSubject, type Observable } from 'rxjs';
import { Component, RxElement, observable } from 'yaw';

export const SLIDER_TEMPLATE = `
    <div class="track"
         onpointerdown="grab($event)"
         onpointermove="drag($event)"
         onpointerup="release($event)">
        <div class="fill" [style]="fillStyle()"></div>
        <div class="thumb" [style]="thumbStyle()"></div>
    </div>
`;

const styles = `
    :host { display: block; padding: 0.5rem 0.6rem; }
    .track { position: relative; height: 0.5rem; background: #1a1a1a;
             border: 1px solid #222; border-radius: 1rem;
             cursor: pointer; touch-action: none; user-select: none; }
    .fill { position: absolute; top: 0; bottom: 0; left: 0;
            background: linear-gradient(90deg, #557 0%, #8af 100%);
            border-radius: 1rem; pointer-events: none; }
    .thumb { position: absolute; top: 50%;
             width: 1.2rem; height: 1.2rem;
             background: #fff; border: 2px solid #8af; border-radius: 50%;
             transform: translate(-50%, -50%);
             box-shadow: 0 0 10px rgba(136, 170, 255, 0.55);
             pointer-events: none;
             transition: box-shadow 0.15s ease; }
    .track:active .thumb { box-shadow: 0 0 14px rgba(136, 170, 255, 0.9); }
`;

export const SLIDER_SOURCE = `@Component({
    selector: 'yaw-slider',
    template: \`${SLIDER_TEMPLATE}\`,
    styles: \`${styles}\`,
})
export class YawSlider extends RxElement<{ value: number }> {
    @observable value = 0;
    private min = 0;
    private max = 100;

    override onInit(): void {
        this.min = Number(this.getAttribute('min') ?? '0');
        this.max = Number(this.getAttribute('max') ?? '100');

        // Two-way bind to parentRef[for] if requested.
        const prop = this.getAttribute('for');
        if (prop !== null && this.hostNode !== undefined) {
            const subj = (this.hostNode as any)[\`\${prop}$\`];
            subj?.subscribe((v: number) => { this.value = v; });
        }
    }

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
        const next = Math.round(this.min + pct * (this.max - this.min));
        const prop = this.getAttribute('for');
        if (prop !== null && this.hostNode !== undefined) {
            (this.hostNode as any)[prop] = next;
        } else {
            this.value = next;
        }
    }

    private ratio(v: number): number { return (v - this.min) / (this.max - this.min); }
    fillStyle(): Observable<string>  { return this.value$.pipe(map((v) => \`width: \${this.ratio(v) * 100}%\`)); }
    thumbStyle(): Observable<string> { return this.value$.pipe(map((v) => \`left: \${this.ratio(v) * 100}%\`)); }
}`;

@Component({
    selector: 'yaw-slider',
    template: SLIDER_TEMPLATE,
    styles,
})
export class YawSlider extends RxElement<{ value: number }> {
    @observable value = 0;
    private min = 0;
    private max = 100;

    override onInit(): void {
        this.min = Number(this.getAttribute('min') ?? '0');
        this.max = Number(this.getAttribute('max') ?? '100');

        const prop = this.getAttribute('for');
        if (prop !== null && this.hostNode !== undefined) {
            const subj = (this.hostNode as unknown as Record<string, unknown>)[`${prop}$`] as BehaviorSubject<number> | undefined;
            subj?.subscribe((v) => { this.value = v; });
        }
    }

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
        const next = Math.round(this.min + pct * (this.max - this.min));
        const prop = this.getAttribute('for');
        if (prop !== null && this.hostNode !== undefined) {
            (this.hostNode as unknown as Record<string, unknown>)[prop] = next;
        } else {
            this.value = next;
        }
    }

    private ratio(v: number): number { return (v - this.min) / (this.max - this.min); }
    fillStyle(): Observable<string>  { return this.value$.pipe(map((v) => `width: ${String(this.ratio(v) * 100)}%`)); }
    thumbStyle(): Observable<string> { return this.value$.pipe(map((v) => `left: ${String(this.ratio(v) * 100)}%`)); }
}
