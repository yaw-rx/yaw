import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[rx-if]' })
export class RxIf {
    host!: RxElementLike;
    private sub: Subscription | undefined;
    private children: Node[] = [];

    onInit(): void {
        this.children = Array.from(this.host.childNodes);
        const raw = this.host.getAttribute('rx-if') ?? '';
        const parsed = parseBind(raw);
        this.sub = subscribeBind(this.host, parsed, (v) => {
            if (Boolean(v)) {
                for (const node of this.children) this.host.appendChild(node);
            } else {
                this.host.replaceChildren();
            }
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
