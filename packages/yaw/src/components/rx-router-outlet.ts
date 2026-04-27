import { type Subscription, switchMap, tap } from 'rxjs';
import { Component, getSelector } from '../component.js';
import { RxElementBase, holdReady, releaseReady } from '../rx-element.js';
import { Inject } from '../di/inject.js';
import { Router } from '../router.js';
import { ssgScope, ssgLeave } from '../ssg-registry.js';

@Component({ selector: 'rx-router-outlet' })
export class RxRouterOutlet extends RxElementBase {
    @Inject(Router) private readonly router!: Router;
    private sub: Subscription | undefined;
    private current: Element | undefined;

    override onInit(): void {
        this.sub = this.router.route$.pipe(
            tap(() => holdReady()),
            switchMap(path => this.router.resolve(path)),
        ).subscribe(ctor => {
            this.current?.remove();
            if (ctor === undefined) { releaseReady(); return; }
            const selector = getSelector(ctor);
            if (selector === undefined) { releaseReady(); return; }
            ssgScope(this);
            this.current = this.appendChild(document.createElement(selector));
            ssgLeave();
            releaseReady();
        });
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
