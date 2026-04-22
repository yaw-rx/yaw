import 'reflect-metadata';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { Component, RxElement } from 'yaw';

@Component({
    selector: 'blink-demo',
    template: `<p rx-if="isVisible">Now you see me</p>`,
    styles: `
        :host { display: block; min-height: 1.5rem; }
        p { color: #8af; font-family: monospace; font-size: 1rem; margin: 0; }
    `,
})
export class BlinkDemo extends RxElement {
    get isVisible$() {
        return timer(0, 2000).pipe(map(n => n % 2 === 0));
    }
}
