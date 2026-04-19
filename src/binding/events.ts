import { evaluateHandler } from '../expression/index.js';
import { registerConnectHook, type RxElementLike } from '../registry.js';

registerConnectHook((el: RxElementLike, parent: RxElementLike | undefined): readonly never[] => {
    if (parent === undefined) return [];

    const ctx = parent as unknown as Record<string, unknown>;

    for (const attr of Array.from(el.attributes)) {
        if (!attr.name.startsWith('data-rx-on-')) continue;
        const event = attr.name.slice('data-rx-on-'.length);
        const method = attr.value;
        el.addEventListener(event, () => { evaluateHandler(method, ctx); });
    }

    return [];
});
