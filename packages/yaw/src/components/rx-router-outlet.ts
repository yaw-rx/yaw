import { type Subscription } from 'rxjs';
import { Component, getSelector } from '../component.js';
import { RxElementBase } from '../rx-element.js';
import { Inject } from '../di/inject.js';
import { Router } from '../router.js';

@Component({ selector: 'rx-router-outlet' })
export class RxRouterOutlet extends RxElementBase {
    @Inject(Router) private readonly router!: Router;
    private sub: Subscription | undefined;
    private current: Element | undefined;

    override onInit(): void {
        this.sub = this.router.route$.subscribe((path) => { this.render(path); });
    }

    private render(path: string): void {
        this.current?.remove();
        const ctor = this.router.resolve(path);
        if (ctor === undefined) return;
        const selector = getSelector(ctor);
        if (selector === undefined) return;
        this.current = this.appendChild(document.createElement(selector));
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
