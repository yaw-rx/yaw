import { BehaviorSubject, combineLatest } from 'rxjs';
import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';
import { SidebarService } from '../services/sidebar-service.js';

const MQ = '(max-width: 768px)';

@Directive({ selector: '[hamburger]' })
@Injectable([SidebarService])
export class Hamburger {
    node!: RxElementLike;
    private readonly sidebar: SidebarService;
    private active = false;

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

        combineLatest([this.sidebar.available$, narrow$]).subscribe(
            ([available, narrow]) => {
                this.active = !!(available && narrow);
                this.node.classList.toggle('has-menu', this.active);
            }
        );
    }

    onDestroy(): void {
        this.node.classList.remove('has-menu');
        this.sidebar.close();
    }
}
