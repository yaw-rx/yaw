import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { evaluate, identifiers } from '../expression/index.js';
import { ExpressionEvalError, MissingParentError, ObservableNotFoundError } from '../errors.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[rx-if]' })
export class RxIf {
    host!: RxElementLike;
    private subs: Subscription[] = [];
    private children: Node[] = [];
    private expr = '';
    private ctx: Record<string, unknown> = {};

    onInit(): void {
        if (this.host.parentRef === undefined) throw new MissingParentError('rx-if', this.host.tagName);

        this.children = Array.from(this.host.childNodes);
        this.expr = this.host.getAttribute('rx-if') ?? '';
        this.ctx = this.host.parentRef as unknown as Record<string, unknown>;

        for (const id of identifiers(this.expr)) {
            const subject = this.ctx[`${id}$`];
            if (subject === null || typeof subject !== 'object' || !('subscribe' in subject)) {
                throw new ObservableNotFoundError('rx-if', this.host.tagName, id);
            }
            this.subs.push((subject as { subscribe: (fn: () => void) => Subscription }).subscribe(() => this.update()));
        }

        this.update();
    }

    private update(): void {
        let show: boolean;
        try {
            show = Boolean(evaluate(this.expr, this.ctx));
        } catch (e) {
            throw new ExpressionEvalError('rx-if', this.host.tagName, this.expr, e);
        }

        if (show) {
            for (const node of this.children) this.host.appendChild(node);
        } else {
            this.host.replaceChildren();
        }
    }

    onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
        this.subs = [];
    }
}
