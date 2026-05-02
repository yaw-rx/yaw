import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { TocService } from '../services/toc-service.js';

@Directive({ selector: '[toc-section]' })
@Injectable([TocService])
export class TocSection {
    node!: RxElementLike;
    private readonly toc: TocService;

    constructor(toc: TocService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;
        const path = node.getAttribute('toc-section') || '';
        const depth = path ? path.split('/').length - 1 : 0;
        node.style.setProperty('--toc-depth', String(depth));
        this.toc.registerSection(path, depth);
    }

    onDestroy(): void {
        const path = this.node.getAttribute('toc-section') || '';
        if (path) this.toc.unregisterSection(path);
    }
}
