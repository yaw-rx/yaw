import { Component, RxElement } from '@yaw-rx/core';
import { Blink } from './blink-demo/blink.js';

@Component({
    selector: 'blink-demo',
    directives: [Blink],
    template: `<p blink>Now you see me</p>`,
    styles: `
        :host { display: block; min-height: 1.5rem; }
        p { color: var(--accent); font-family: monospace; font-size: 1rem; margin: 0; }
    `,
})
export class BlinkDemo extends RxElement {}
