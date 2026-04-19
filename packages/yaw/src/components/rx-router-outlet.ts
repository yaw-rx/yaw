import { type Subscription } from 'rxjs';
import { Component, getSelector } from '../component.js';
import { RxElementBase } from '../rx-element.js';
import { Router } from '../router.js';

@Component({ selector: 'rx-router-outlet' })
export class RxRouterOutlet extends RxElementBase {
    private sub: Subscription | undefined;
    private current: Element | undefined;

    override onInit(): void {
        const router = RxElementBase.resolveInjector(this).resolve(Router);
        this.sub = router.route$.subscribe((path) => { this.render(router, path); });
    }

    private render(router: Router, path: string): void {
        this.current?.remove();
        const ctor = router.resolve(path);
        if (ctor === undefined) return;
        const selector = getSelector(ctor);
        if (selector === undefined) return;
        this.current = this.appendChild(document.createElement(selector));
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
