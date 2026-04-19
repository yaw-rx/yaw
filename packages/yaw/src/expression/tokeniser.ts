export type TokenType =
    | 'ident'
    | 'number'
    | 'string'
    | 'bool'
    | 'null'
    | 'op'
    | 'dot'
    | 'comma'
    | 'ternary'
    | 'lparen'
    | 'rparen'
    | 'lbracket'
    | 'rbracket';

export interface Token {
    readonly type: TokenType;
    readonly value: string;
}

const PATTERNS: readonly [TokenType, RegExp][] = [
    ['bool',     /^(true|false)(?=\W|$)/],
    ['null',     /^(null|undefined)(?=\W|$)/],
    ['string',   /^'(?:[^'\\]|\\.)*'|^"(?:[^"\\]|\\.)*"|^`(?:[^`\\]|\\.)*`/],
    ['number',   /^\d+(?:\.\d+)?/],
    ['ident',    /^[a-zA-Z_$][\w$]*/],
    ['op',       /^(===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%!<>&|^~])/],
    ['dot',      /^\./],
    ['comma',    /^,/],
    ['ternary',  /^[?:]/],
    ['lparen',   /^\(/],
    ['rparen',   /^\)/],
    ['lbracket', /^\[/],
    ['rbracket', /^\]/],
];

export const tokenise = (expr: string): Token[] => {
    const tokens: Token[] = [];
    let src = expr.trim();

    while (src.length > 0) {
        if (/^\s/.test(src)) { src = src.replace(/^\s+/, ''); continue; }

        let matched = false;
        for (const [type, pattern] of PATTERNS) {
            const m = pattern.exec(src);
            if (m !== null) {
                tokens.push({ type, value: m[0] });
                src = src.slice(m[0].length);
                matched = true;
                break;
            }
        }
        if (!matched) throw new Error(`Unexpected character in expression: ${src[0]}`);
    }

    return tokens;
};
