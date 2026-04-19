import { Directive } from '../directive.js';
import { evaluateHandler } from '../expression/index.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-on-*]' })
export class EventsDirective {
    host!: RxElementLike;
    private listeners: Array<{ event: string; fn: EventListener }> = [];

    onInit(): void {
        const ctx = this.host.parentRef as unknown as Record<string, unknown>;

        for (const attr of Array.from(this.host.attributes)) {
            if (!attr.name.startsWith('data-rx-on-')) continue;
            const event = attr.name.slice('data-rx-on-'.length);
            const method = attr.value;
            const fn: EventListener = () => { evaluateHandler(method, ctx); };
            this.host.addEventListener(event, fn);
            this.listeners.push({ event, fn });
        }
    }

    onDestroy(): void {
        for (const { event, fn } of this.listeners) {
            this.host.removeEventListener(event, fn);
        }
        this.listeners = [];
    }
}
