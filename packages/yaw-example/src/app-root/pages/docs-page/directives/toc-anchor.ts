import { Directive, Injectable } from 'yaw';
import type { RxElementLike } from 'yaw';
import { TocService } from '../services/toc-service.js';

const TOP_OFFSET = 80;

@Directive({ selector: '[toc-anchor]' })
@Injectable([TocService])
export class TocAnchor {
    node!: RxElementLike;
    private readonly toc: TocService;
    private path: string | undefined;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;
        node.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;
        this.path = node.getAttribute('toc-anchor') || undefined;
        if (!this.path) return;
        const label = node.textContent ?? '';
        this.toc.registerAnchor(this.path, label, node as HTMLElement);
    }

    onDestroy(): void {
        if (this.path) this.toc.unregisterAnchor(this.path);
    }
}
