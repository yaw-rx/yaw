import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';
import { TocService } from '../services/toc-service.js';

const TOP_OFFSET = 80;

@Directive({ selector: '[toc-section]' })
@Injectable([TocService])
export class TocSection {
    node!: RxElementLike;
    private readonly toc: TocService;
    private id: string | undefined;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;

        let depth = 0;
        let ancestor: Element | null = node.parentElement;
        while (ancestor !== null) {
            if (ancestor.hasAttribute('toc-section')) depth++;
            ancestor = ancestor.parentElement;
        }
        node.style.setProperty('--toc-depth', String(depth));

        this.id = node.id;
        if (!this.id) return;

        queueMicrotask(() => {
            const first = node.firstElementChild;
            const isHeading = first !== null && /^(rx-)?h[1-6]$/i.test(first.tagName);
            const tracked: HTMLElement = isHeading ? first as HTMLElement : node;
            tracked.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;
            const label = isHeading ? (first as HTMLElement).textContent ?? '' : '';
            this.toc.register(this.id!, label, depth, node as HTMLElement);
        });
    }

    onDestroy(): void {
        if (this.id) {
            this.toc.unregister(this.id);
        }
    }
}
