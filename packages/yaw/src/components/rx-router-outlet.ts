import { type Subscription, switchMap } from 'rxjs';
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
        this.sub = this.router.route$.pipe(
            switchMap(path => this.router.resolve(path)),
        ).subscribe(ctor => {
            this.current?.remove();
            this.current = undefined;
            if (ctor === undefined) return;
            const selector = getSelector(ctor);
            if (selector === undefined) return;
            this.current = this.querySelector(':scope > ' + selector) ?? undefined;
            if (this.current === undefined) {
                this.current = this.appendChild(document.createElement(selector));
            }
            // Two microtasks: first lets MutationObserver process the new subtree (firing onInit/register),
            // second fires after all directives and components have initialized.
            queueMicrotask(() => queueMicrotask(() => this.router.pageReady$.next(this.router.route$.getValue())));
        });
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
