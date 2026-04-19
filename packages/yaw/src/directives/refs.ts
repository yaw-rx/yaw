import { Directive } from '../directive.js';
import { parseBind, resolveRefTarget } from '../expression/bind.js';
import type { RxElementLike } from '../directive.js';

@Directive({ selector: '[data-rx-ref]' })
export class RefsDirective {
    host!: RxElementLike;

    onInit(): void {
        const raw = this.host.getAttribute('data-rx-ref');
        if (raw === null) return;
        const parsed = parseBind(raw);
        const { scope, key } = resolveRefTarget(this.host, parsed);
        (scope as unknown as Record<string, unknown>)[key] = this.host;
    }

    onDestroy(): void {
        const raw = this.host.getAttribute('data-rx-ref');
        if (raw === null) return;
        const parsed = parseBind(raw);
        const { scope, key } = resolveRefTarget(this.host, parsed);
        (scope as unknown as Record<string, unknown>)[key] = undefined;
    }
}
