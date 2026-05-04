import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[rx-if]' })
export class RxIf {
    node!: RxElementLike;
    private sub: Subscription | undefined;
    private template!: HTMLTemplateElement;

    onInit(): void {
        const existing = this.node.querySelector(':scope > template[rx-if-store]') as HTMLTemplateElement | null;
        if (existing) {
            this.template = existing;
        } else {
            this.template = document.createElement('template');
            this.template.setAttribute('rx-if-store', '');
            for (const child of Array.from(this.node.childNodes)) {
                this.template.content.appendChild(child);
            }
            this.node.appendChild(this.template);
        }

        const raw = this.node.getAttribute('rx-if') ?? '';
        const parsed = parseBind(raw);
        this.sub = subscribeBind(this.node, parsed, (v) => {
            if (Boolean(v)) {
                for (const child of Array.from(this.template.content.childNodes)) {
                    this.node.insertBefore(child, this.template);
                }
            } else {
                for (const child of Array.from(this.node.childNodes)) {
                    if (child !== this.template) this.template.content.appendChild(child);
                }
            }
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
