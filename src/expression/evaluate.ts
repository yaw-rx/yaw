export const evaluate = (expr: string, context: Record<string, unknown>): unknown => {
    const keys = Object.keys(context);
    const vals = keys.map((k) => context[k]);
    return new Function(...keys, `"use strict"; return (${expr});`)(...vals) as unknown;
};

export const evaluateHandler = (method: string, context: Record<string, unknown>): void => {
    const fn = context[method];
    if (typeof fn === 'function') fn.call(context);
};
