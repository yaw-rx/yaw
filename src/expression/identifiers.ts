import { tokenise } from './tokeniser.js';

const KEYWORDS = new Set([
    'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
    'in', 'of', 'new', 'void', 'delete', 'return',
]);

export const identifiers = (expr: string): readonly string[] => {
    const tokens = tokenise(expr);
    const result: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (tok === undefined) continue;
        if (tok.type !== 'ident' || KEYWORDS.has(tok.value)) continue;
        const prev = tokens[i - 1];
        if (prev === undefined || prev.type !== 'dot') {
            result.push(tok.value);
        }
    }

    return [...new Set(result)];
};
