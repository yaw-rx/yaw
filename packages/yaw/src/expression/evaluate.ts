const enumerableKeys = (context: Record<string, unknown>): string[] => {
    const seen = new Set<string>();
    let proto: object | null = context;
    while (proto !== null && proto !== Object.prototype) {
        for (const desc of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
            const [key, descriptor] = desc;
            if (descriptor.enumerable === true) { seen.add(key); }
        }
        const next: unknown = Object.getPrototypeOf(proto);
        proto = (next !== null && typeof next === 'object') ? next : null;
    }
    return [...seen];
};

export const evaluate = (expr: string, context: Record<string, unknown>): unknown => {
    const keys = enumerableKeys(context);
    const vals = keys.map((k) => context[k]);
    return new Function(...keys, `"use strict"; return (${expr});`)(...vals) as unknown;
};

export const evaluateHandler = (method: string, context: Record<string, unknown>): void => {
    const fn = context[method];
    if (typeof fn === 'function') fn.call(context);
};
