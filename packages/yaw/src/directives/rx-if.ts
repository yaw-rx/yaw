import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';
import { isHydrating } from '../rx-element.js';

@Directive({ selector: '[rx-if]' })
export class RxIf {
    node!: RxElementLike;
    private sub: Subscription | undefined;
    private children: Node[] = [];

    onInit(): void {
        this.children = Array.from(this.node.childNodes);
        const raw = this.node.getAttribute('rx-if') ?? '';
        const parsed = parseBind(raw);
        let first = isHydrating();
        this.sub = subscribeBind(this.node, parsed, (v) => {
            if (first) { first = false; return; }
            if (Boolean(v)) {
                for (const node of this.children) this.node.appendChild(node);
            } else {
                this.node.replaceChildren();
            }
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
