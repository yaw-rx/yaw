import { Component, RxElement } from 'yaw';
import { Blink } from './blink-demo/blink.js';

@Component({
    selector: 'blink-demo',
    directives: [Blink],
    template: `<p blink>Now you see me</p>`,
    styles: `
        :host { display: block; min-height: 1.5rem; }
        p { color: #8af; font-family: monospace; font-size: 1rem; margin: 0; }
    `,
})
export class BlinkDemo extends RxElement {}
