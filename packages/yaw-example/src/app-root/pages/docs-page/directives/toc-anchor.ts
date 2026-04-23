import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';
import { TocService } from '../services/toc-service.js';

const TOP_OFFSET = 80;

@Directive({ selector: '[toc-anchor]' })
@Injectable([TocService])
export class TocAnchor {
    node!: RxElementLike;
    private readonly toc: TocService;
    private id: string | undefined;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;
        node.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;

        this.id = node.id;
        if (!this.id) return;

        let depth = 0;
        let ancestor: Element | null = node.parentElement;
        while (ancestor !== null) {
            if (ancestor.hasAttribute('toc-section')) depth++;
            ancestor = ancestor.parentElement;
        }

        const label = node.textContent ?? '';
        this.toc.register(this.id, label, depth, node as HTMLElement);
    }

    onDestroy(): void {
        if (this.id) {
            this.toc.unregister(this.id);
        }
    }
}
