import { type Subscription } from 'rxjs';
import { Directive, type ParsedExpr } from '../directive.js';
import { ExpressionParseError, MissingParentError, ObservableNotFoundError } from '../errors.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[rx-for]' })
export class RxFor {
    host!: RxElementLike;
    parsed?: ParsedExpr;
    private sub: Subscription | undefined;
    private key = 'id';
    private content = '';
    private nodes = new Map<unknown, Element>();

    parseExpr(raw: string): ParsedExpr {
        const parts = raw.split(' by ');
        if (parts[0] === undefined || parts[0].trim() === '') {
            throw new ExpressionParseError('rx-for', this.host.tagName, raw, 'expected "expr by key"');
        }
        return { expr: parts[0].trim(), key: parts[1]?.trim() ?? 'id' };
    }

    onInit(): void {
        if (this.host.parentRef === undefined) throw new MissingParentError('rx-for', this.host.tagName);

        this.key = this.parsed?.['key'] ?? 'id';
        this.content = this.host.innerHTML;
        this.host.replaceChildren();

        const expr = this.parsed?.expr ?? '';
        const ctx = this.host.parentRef as unknown as Record<string, unknown>;
        const subject = ctx[`${expr}$`];

        if (subject === null || typeof subject !== 'object' || !('subscribe' in subject)) {
            throw new ObservableNotFoundError('rx-for', this.host.tagName, expr);
        }

        this.sub = (subject as { subscribe: (fn: (v: unknown[]) => void) => Subscription })
            .subscribe((items) => { this.update(items); });
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
