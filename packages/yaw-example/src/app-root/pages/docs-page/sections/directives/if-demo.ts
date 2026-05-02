import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxIf } from '@yaw-rx/core/directives/rx-if';

@Component({
    selector: 'if-demo',
    directives: [RxIf],
    template: `
        <button onclick="toggle">{{label}}</button>
        <div rx-if="isLoggedIn">
            <p>Welcome back, Jonathan</p>
        </div>
    `,
    styles: `
        :host { display: block; min-height: 5rem; width: 100%; }
        button { background: #111; border: 1px solid #333; color: #fff;
                 padding: 0.5rem 1rem; font: inherit; font-size: 0.85rem;
                 font-family: monospace; cursor: pointer; border-radius: 6px;
                 min-width: 6rem; }
        button:hover { background: #1a1a1a; border-color: #8af; color: #8af; }
        p { color: #8af; font-family: monospace; font-size: 1rem; margin: 0.75rem 0 0; }
    `,
})
export class IfDemo extends RxElement {
    @state isLoggedIn = false;

    toggle(): void {
        this.isLoggedIn = !this.isLoggedIn;
    }

    get label$(): Observable<string> {
        return this.isLoggedIn$.pipe(map((v) => v ? 'logout' : 'login'));
    }
}
