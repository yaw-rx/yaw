import 'reflect-metadata';
import { Component, RxElementBase } from 'yaw';

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
export class AppRoot extends RxElementBase {}
