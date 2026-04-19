import 'reflect-metadata';
import { Component, RxElement } from 'yaw';

@Component({
    selector: 'app-root',
    template: `
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    `,
    styles: `
        app-root { display: block; }
    `
})
export class AppRoot extends RxElement {}
