import { Component, RxElement } from 'yaw';
import 'yaw/router/outlet';
import './app-root/components/nav-bar.js';
import { SidebarService } from './app-root/services/sidebar-service.js';

@Component({
    selector: 'app-root',
    providers: [SidebarService],
    template: `
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    `,
    styles: `
        :host { display: block; }
    `
})
export class AppRoot extends RxElement {}
