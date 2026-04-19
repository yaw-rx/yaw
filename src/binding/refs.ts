import { registerConnectHook, registerDisconnectHook, type RxElementLike } from '../registry.js';

registerConnectHook((el: RxElementLike, parent: RxElementLike | undefined): readonly never[] => {
    if (parent === undefined) return [];
    const ref = el.getAttribute('data-rx-ref');
    if (ref !== null) {
        (parent as unknown as Record<string, unknown>)[ref] = el;
    }
    return [];
});

registerDisconnectHook((el: RxElementLike, parent: RxElementLike | undefined): void => {
    if (parent === undefined) return;
    const ref = el.getAttribute('data-rx-ref');
    if (ref !== null) {
        (parent as unknown as Record<string, unknown>)[ref] = undefined;
    }
});
