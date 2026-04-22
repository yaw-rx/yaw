import 'reflect-metadata';
import { Component, RxElement, observable } from 'yaw';
import { Blink } from './blink-demo/blink.js';

@Component({
    selector: 'blink-demo',
    directives: [Blink],
    template: `
        <button onclick="toggle">{{label}}</button>
        <div rx-if="visible">
            <p blink>Now you see me</p>
        </div>
    `,
    styles: `
        :host { display: block; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
                 font-family: monospace; cursor: pointer; border-radius: 6px;
                 margin-bottom: 0.75rem; }
        button:hover { border-color: #8af; color: #8af; }
        p { color: #8af; font-family: monospace; font-size: 1rem; margin: 0; }
    `,
})
export class BlinkDemo extends RxElement<{ visible: boolean; label: string }> {
    @observable visible = true;
    @observable label = 'Hide';

    toggle(): void {
        this.visible = !this.visible;
        this.label = this.visible ? 'Hide' : 'Show';
    }
}
