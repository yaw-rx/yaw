/**
 * rx-for — list rendering directive.
 *
 * Attach `rx-for="expression by key"` to any element. The expression must
 * resolve to an Observable that emits arrays. On each emission the directive
 * creates, updates, or removes child elements to match the incoming array.
 *
 * How it works:
 *
 * 1. The directive reads the `rx-for` attribute and splits it into a source
 *    expression and an optional key field (defaults to `id`).
 *
 * 2. It saves the element's innerHTML as a template string — this is the HTML
 *    that gets copied for each item in the array. The element's children are
 *    then cleared so the directive controls what's inside.
 *
 * 3. It subscribes to the source expression through the standard binding
 *    system (`subscribeBind`). The source walks to the host component via
 *    `closest('[data-rx-host]')` and resolves through the host's observable
 *    fields, exactly like any other binding.
 *
 * 4. Each time the source emits an array, the directive reconciles:
 *    - For each item, extract the key field value (e.g. `item.id`).
 *    - If a child element already exists for that key, reuse it.
 *    - If not, insert a copy of the saved template HTML. Before insertion,
 *      the host component is pushed onto the render scope stack so that any
 *      child elements created during insertion get the correct `hostNode`.
 *      This is how nested components inside the list find their parent for
 *      directive lookup and dependency injection.
 *    - After insertion, every property on the item object is assigned directly
 *      onto the child element (`element[prop] = value`). This is "splat mode" —
 *      the child is typically a component with `@observable` fields, and
 *      setting a property triggers its BehaviorSubject, which drives that
 *      component's own template bindings.
 *    - Child elements whose keys are no longer in the array are removed.
 *
 * 5. On destroy, the source subscription is cleaned up and the element map
 *    is cleared.
 *
 * The directive is optional — include it in the `directives` array at
 * bootstrap, or omit it. The core framework has no dependency on it.
 */
import { type Subscription } from 'rxjs';
import { Directive } from '../directive.js';
import { BindParseError } from '../errors.js';
import { parseBind, subscribeBind } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';
import { pushRenderScope, popRenderScope, RxElementBase } from '../rx-element.js';

@Directive({ selector: '[rx-for]' })
export class RxFor {
    node!: RxElementLike;
    private sub: Subscription | undefined;
    private key = 'id';
    private content = '';
    private nodes = new Map<unknown, Element>();

    onInit(): void {
        const raw = this.node.getAttribute('rx-for') ?? '';
        const [exprPart, keyPart] = raw.split(' by ');
        if (exprPart === undefined || exprPart.trim() === '') {
            throw new BindParseError(raw, 'rx-for expected "expr by key"');
        }
        this.key = keyPart?.trim() ?? 'id';
        this.content = this.node.innerHTML;
        this.node.replaceChildren();

        const parsed = parseBind(exprPart.trim());
        this.sub = subscribeBind(this.node, parsed, (v) => {
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
                const scope = this.node.hostNode instanceof RxElementBase ? this.node.hostNode : undefined;
                if (scope !== undefined) pushRenderScope(scope);
                this.node.insertAdjacentHTML('beforeend', this.content);
                if (scope !== undefined) popRenderScope();
                el = this.node.lastElementChild!;
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
