import { Directive } from '../directive.js';
import { parseBind, resolveEventHandler } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-on-*]' })
export class EventsDirective {
    host!: RxElementLike;
    private listeners: Array<{ event: string; fn: EventListener }> = [];

    onInit(): void {
        for (const attr of Array.from(this.host.attributes)) {
            if (!attr.name.startsWith('data-rx-on-')) continue;
            const event = attr.name.slice('data-rx-on-'.length);
            const parsed = parseBind(attr.value);
            const handler = resolveEventHandler(this.host, parsed);
            const listener: EventListener = (e) => { handler.invoke(e); };
            this.host.addEventListener(event, listener);
            this.listeners.push({ event, fn: listener });
        }
    }

    onDestroy(): void {
        for (const { event, fn } of this.listeners) {
            this.host.removeEventListener(event, fn);
        }
        this.listeners = [];
    }
}
