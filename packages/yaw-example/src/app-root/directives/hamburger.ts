import { BehaviorSubject, combineLatest, map, type Subscription } from 'rxjs';
import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { SidebarService } from '../services/sidebar-service.js';

const MQ = '(max-width: 768px)';

@Directive({ selector: '[hamburger]' })
@Injectable([SidebarService, Router])
export class Hamburger {
    node!: RxElementLike;
    private readonly sidebar: SidebarService;
    private readonly router: Router;
    private active = false;
    private funnel = false;
    private subs: Subscription[] = [];

    constructor(sidebar: SidebarService, router: Router) {
        this.sidebar = sidebar;
        this.router = router;
    }

    onInit(): void {
        const mq = window.matchMedia(MQ);
        const narrow$ = new BehaviorSubject(mq.matches);
        mq.addEventListener('change', () => narrow$.next(mq.matches));

        this.node.addEventListener('click', (e: Event) => {
            if (!this.active) return;
            e.preventDefault();
            e.stopPropagation();
            this.sidebar.toggle();
        });

        const sidebarKnown$ = this.router.pageReady$.pipe(
            map(() => this.sidebar.isAvailable()),
        );

        this.subs.push(
            combineLatest([sidebarKnown$, narrow$]).subscribe(
                ([available, narrow]) => {
                    this.active = !!(available && narrow);
                    this.node.classList.toggle('has-menu', this.active);
                    const showFunnel = !!(available && narrow);
                    if (showFunnel && !this.funnel) {
                        requestAnimationFrame(() => {
                            this.node.classList.add('has-funnel');
                            requestAnimationFrame(() => {
                                this.node.classList.add('funnel-visible');
                            });
                        });
                    } else if (showFunnel && this.funnel) {
                        this.node.classList.add('has-funnel', 'funnel-visible');
                    } else if (!showFunnel) {
                        this.node.classList.remove('has-funnel', 'funnel-visible');
                    }
                    this.funnel = showFunnel;
                }
            ),
            this.sidebar.open$.subscribe((open: boolean) => {
                this.node.classList.toggle('menu-open', open);
            }),
        );
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.node.classList.remove('has-funnel', 'funnel-visible', 'has-menu', 'menu-open');
        this.sidebar.close();
    }
}
