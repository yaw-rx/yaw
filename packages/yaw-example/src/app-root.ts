import { Component, RxElement } from 'yaw';

@Component({
    selector: 'app-root',
    template: `
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    `,
    styles: `
        :host { display: block; }
    `
})
export class AppRoot extends RxElement {}
