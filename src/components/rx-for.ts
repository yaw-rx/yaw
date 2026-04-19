import { type Subscription } from 'rxjs';
import { Component } from '../component.js';
import { RxElement } from '../rx-element.js';
import { observable } from '../observable.js';

@Component({ selector: 'rx-for', template: '' })
export class RxFor extends RxElement<{ items: unknown[] }> {
    @observable items: unknown[] = [];
    private key = 'id';
    private content = '';
    private nodes = new Map<unknown, Element>();
    private sub: Subscription | undefined;

    override onInit(): void {
        this.key = this.getAttribute('key') ?? 'id';

        const tpl = this.firstElementChild;
        if (tpl instanceof HTMLTemplateElement) this.content = tpl.innerHTML;

        this.sub = this.items$.subscribe((incoming) => { this.update(incoming); });
    }

    private update(incoming: unknown[]): void {
        const next = new Map<unknown, Element>();

        for (const item of incoming) {
            const k = (item as Record<string, unknown>)[this.key];
            let el = this.nodes.get(k);

            if (el === undefined) {
                this.insertAdjacentHTML('beforeend', this.content);
                el = this.lastElementChild!;
            }

            for (const [prop, val] of Object.entries(item as Record<string, unknown>)) {
                (el as unknown as Record<string, unknown>)[prop] = val;
            }

            next.set(k, el);
        }

        for (const [k, el] of this.nodes) {
            if (!next.has(k)) el.remove();
        }

        this.nodes = next;
    }

    override onDestroy(): void {
        this.sub?.unsubscribe();
        this.nodes.clear();
    }
}
