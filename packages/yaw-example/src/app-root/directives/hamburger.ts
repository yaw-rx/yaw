import { BehaviorSubject, combineLatest, type Subscription } from 'rxjs';
import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { SidebarService } from '../services/sidebar-service.js';

const MQ = '(max-width: 768px)';

@Directive({ selector: '[hamburger]' })
@Injectable([SidebarService])
export class Hamburger {
    node!: RxElementLike;
    private readonly sidebar: SidebarService;
    private active = false;
    private subs: Subscription[] = [];

    constructor(sidebar: SidebarService) {
        this.sidebar = sidebar;
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

        this.subs.push(
            combineLatest([this.sidebar.available$, narrow$]).subscribe(
                ([available, narrow]) => {
                    this.active = !!(available && narrow);
                    const hadFunnel = this.node.classList.contains('has-funnel');
                    this.node.classList.toggle('has-funnel', !!available);
                    this.node.classList.toggle('has-menu', this.active);
                    if (available && !hadFunnel) {
                        requestAnimationFrame(() => {
                            this.node.classList.add('funnel-visible');
                        });
                    } else if (!available) {
                        this.node.classList.remove('funnel-visible');
                    }
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
