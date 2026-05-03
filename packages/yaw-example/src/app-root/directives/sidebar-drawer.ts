import { type Subscription } from 'rxjs';
import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { SidebarService } from '../services/sidebar-service.js';
import { TocService } from '../pages/docs-page/services/toc-service.js';

const MQ = '(max-width: 768px)';

@Directive({ selector: '[sidebar-drawer]' })
@Injectable([SidebarService, TocService])
export class SidebarDrawer {
    node!: RxElementLike;
    private readonly sidebar: SidebarService;
    private readonly toc: TocService;
    private mobile = false;
    private sub: Subscription | undefined;
    private mqHandler: (() => void) | undefined;
    private mq: MediaQueryList | undefined;

    constructor(sidebar: SidebarService, toc: TocService) {
        this.sidebar = sidebar;
        this.toc = toc;
    }

    onInit(): void {
        this.sidebar.available = true;

        this.mq = window.matchMedia(MQ);
        const update = (): void => {
            this.mobile = this.mq!.matches;
            if (this.mobile) {
                this.node.style.cssText =
                    'display:none;position:fixed;inset:0;' +
                    'z-index:150;background:#000;padding-top:4rem;overflow-y:auto;' +
                    'width:100vw;height:100vh;';
            } else {
                this.node.style.cssText = '';
                this.sidebar.close();
            }
        };
        this.mqHandler = update;
        this.mq.addEventListener('change', update);
        update();

        this.sub = this.sidebar.open$.subscribe((open: boolean) => {
            if (!this.mobile) return;
            if (open) {
                this.node.style.display = 'block';
                this.toc.pause();
                this.toc.expandAll = true;
            } else {
                this.node.style.display = 'none';
                this.toc.expandAll = false;
                this.toc.resume();
            }
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
        if (this.mq && this.mqHandler) this.mq.removeEventListener('change', this.mqHandler);
        this.sidebar.available = false;
        this.sidebar.close();
    }
}
