import { type Subscription } from 'rxjs';

export type RxElementLike = HTMLElement & {
    parentRef: RxElementLike | undefined;
    __injector: unknown;
};

export interface ConnectHook {
    (el: RxElementLike, parent: RxElementLike | undefined): readonly Subscription[];
}

export interface DisconnectHook {
    (el: RxElementLike, parent: RxElementLike | undefined): void;
}

const connectHooks: ConnectHook[] = [];
const disconnectHooks: DisconnectHook[] = [];

export const registerConnectHook = (hook: ConnectHook): void => { connectHooks.push(hook); };
export const registerDisconnectHook = (hook: DisconnectHook): void => { disconnectHooks.push(hook); };

export const runConnectHooks = (
    el: RxElementLike,
    parent: RxElementLike | undefined,
): readonly Subscription[] =>
    connectHooks.flatMap((hook) => [...hook(el, parent)]);

export const runDisconnectHooks = (
    el: RxElementLike,
    parent: RxElementLike | undefined,
): void => { disconnectHooks.forEach((hook) => { hook(el, parent); }); };
