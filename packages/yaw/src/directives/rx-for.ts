import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { BindParseError } from '../errors.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[rx-for]' })
export class RxFor {
    host!: RxElementLike;
    private sub: Subscription | undefined;
    private key = 'id';
    private content = '';
    private nodes = new Map<unknown, Element>();

    onInit(): void {
        const raw = this.host.getAttribute('rx-for') ?? '';
        const [exprPart, keyPart] = raw.split(' by ');
        if (exprPart === undefined || exprPart.trim() === '') {
            throw new BindParseError(raw, 'rx-for expected "expr by key"');
        }
        this.key = keyPart?.trim() ?? 'id';
        this.content = this.host.innerHTML;
        this.host.replaceChildren();

        const parsed = parseBind(exprPart.trim());
        this.sub = subscribeBind(this.host, parsed, (v) => {
            if (!Array.isArray(v)) {
                throw new BindParseError(parsed.raw, `rx-for expected array, got ${typeof v}`);
            }
            this.update(v);
        });
    }

    private update(incoming: unknown[]): void {
        const next = new Map<unknown, Element>();

        for (const item of incoming) {
            const k = (item as Record<string, unknown>)[this.key];
            let el = this.nodes.get(k);

            if (el === undefined) {
                this.host.insertAdjacentHTML('beforeend', this.content);
                el = this.host.lastElementChild!;
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

    onDestroy(): void {
        this.sub?.unsubscribe();
        this.nodes.clear();
    }
}
