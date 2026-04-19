import { isObservable, of, Subscription, switchMap, type Observable } from 'rxjs';
import { BindNotSubscribableError, BindParseError, BindPathError, BindScopeError } from '../errors.js';
import type { RxElementLike } from '../directive.js';

export interface ParsedRef {
    readonly carets: number;
    readonly path: readonly string[];
}

export type ParsedArg =
    | { readonly kind: 'literal'; readonly value: unknown }
    | { readonly kind: 'event' }
    | { readonly kind: 'ref'; readonly ref: ParsedRef };

export interface ParsedBind extends ParsedRef {
    readonly raw: string;
    readonly call: boolean;
    readonly args: readonly ParsedArg[];
}

class Cursor {
    pos = 0;
    constructor(readonly src: string) {}
    skipWs(): void {
        while (this.pos < this.src.length && /\s/.test(this.src[this.pos]!)) this.pos++;
    }
    eat(c: string): boolean {
        this.skipWs();
        if (this.src[this.pos] !== c) return false;
        this.pos++;
        return true;
    }
    atEnd(): boolean {
        this.skipWs();
        return this.pos >= this.src.length;
    }
}

const IDENT_HEAD = /[a-zA-Z_$]/;
const IDENT_TAIL = /[\w$]/;

const parseIdent = (cur: Cursor, raw: string): string => {
    const start = cur.pos;
    if (!IDENT_HEAD.test(cur.src[cur.pos] ?? '')) {
        throw new BindParseError(raw, `expected identifier at position ${cur.pos}`);
    }
    cur.pos++;
    while (cur.pos < cur.src.length && IDENT_TAIL.test(cur.src[cur.pos]!)) cur.pos++;
    return cur.src.slice(start, cur.pos);
};

const parseRef = (cur: Cursor, raw: string): ParsedRef => {
    cur.skipWs();
    let carets = 0;
    while (cur.src[cur.pos] === '^') { carets++; cur.pos++; }
    if (carets > 0) {
        if (cur.src[cur.pos] !== '.') throw new BindParseError(raw, 'expected "." after "^"');
        cur.pos++;
    }
    const path: string[] = [parseIdent(cur, raw)];
    while (cur.src[cur.pos] === '.') {
        cur.pos++;
        path.push(parseIdent(cur, raw));
    }
    return { carets, path };
};

const parseArg = (cur: Cursor, raw: string): ParsedArg => {
    cur.skipWs();
    const c = cur.src[cur.pos];
    if (c === "'" || c === '"') {
        const quote = c;
        cur.pos++;
        const start = cur.pos;
        while (cur.pos < cur.src.length && cur.src[cur.pos] !== quote) cur.pos++;
        if (cur.pos >= cur.src.length) throw new BindParseError(raw, 'unterminated string literal');
        const value = cur.src.slice(start, cur.pos);
        cur.pos++;
        return { kind: 'literal', value };
    }
    if (c === '-' || (c !== undefined && /\d/.test(c))) {
        const start = cur.pos;
        if (c === '-') cur.pos++;
        while (cur.pos < cur.src.length && /[\d.]/.test(cur.src[cur.pos]!)) cur.pos++;
        return { kind: 'literal', value: Number(cur.src.slice(start, cur.pos)) };
    }
    if (c === '$') {
        if (cur.src.slice(cur.pos, cur.pos + 6) !== '$event') throw new BindParseError(raw, 'expected "$event"');
        cur.pos += 6;
        return { kind: 'event' };
    }
    if (cur.src.startsWith('true', cur.pos)) { cur.pos += 4; return { kind: 'literal', value: true }; }
    if (cur.src.startsWith('false', cur.pos)) { cur.pos += 5; return { kind: 'literal', value: false }; }
    if (cur.src.startsWith('null', cur.pos)) { cur.pos += 4; return { kind: 'literal', value: null }; }
    return { kind: 'ref', ref: parseRef(cur, raw) };
};

const cache = new Map<string, ParsedBind>();

export const parseBind = (raw: string): ParsedBind => {
    const hit = cache.get(raw);
    if (hit !== undefined) return hit;

    const trimmed = raw.trim();
    const cur = new Cursor(trimmed);
    const ref = parseRef(cur, raw);

    let call = false;
    const args: ParsedArg[] = [];
    if (cur.eat('(')) {
        call = true;
        if (!cur.eat(')')) {
            args.push(parseArg(cur, raw));
            while (cur.eat(',')) args.push(parseArg(cur, raw));
            if (!cur.eat(')')) throw new BindParseError(raw, 'expected ")"');
        }
    }
    if (!cur.atEnd()) throw new BindParseError(raw, `unexpected input at position ${cur.pos}`);

    const parsed: ParsedBind = { raw, carets: ref.carets, path: ref.path, call, args };
    cache.set(raw, parsed);
    return parsed;
};

const walkScope = (host: RxElementLike, carets: number, raw: string): RxElementLike => {
    let scope: RxElementLike | undefined = host.parentRef;
    for (let i = 0; i < carets; i++) {
        if (scope === undefined) throw new BindScopeError(host.tagName, raw, carets);
        scope = scope.parentRef;
    }
    if (scope === undefined) throw new BindScopeError(host.tagName, raw, carets);
    return scope;
};

const resolveRef = (host: RxElementLike, ref: ParsedRef, raw: string): unknown => {
    let cur: unknown = walkScope(host, ref.carets, raw);
    for (const seg of ref.path) {
        if (cur === null || cur === undefined) throw new BindPathError(host.tagName, raw, seg);
        cur = (cur as Record<string, unknown>)[seg];
    }
    return cur;
};

const resolveArgs = (host: RxElementLike, parsed: ParsedBind, event: unknown): unknown[] =>
    parsed.args.map((arg) => {
        if (arg.kind === 'literal') return arg.value;
        if (arg.kind === 'event') return event;
        return resolveRef(host, arg.ref, parsed.raw);
    });

const segmentStream = (host: RxElementLike, parsed: ParsedBind, value: unknown, segment: string): Observable<unknown> => {
    if (value === null || value === undefined) {
        throw new BindPathError(host.tagName, parsed.raw, segment);
    }
    const obj = value as Record<string, unknown>;
    const reactive = obj[`${segment}$`];
    if (isObservable(reactive)) return reactive as Observable<unknown>;
    if (!(segment in obj)) throw new BindPathError(host.tagName, parsed.raw, segment);
    return of(obj[segment]);
};

export const subscribeBind = (
    host: RxElementLike,
    parsed: ParsedBind,
    onValue: (v: unknown) => void,
): Subscription => {
    const scope = walkScope(host, parsed.carets, parsed.raw);
    const segments = parsed.path;

    let stream: Observable<unknown> = of(scope as unknown);
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const isLast = i === segments.length - 1;
        stream = stream.pipe(switchMap((v) => {
            if (isLast && parsed.call) {
                if (v === null || v === undefined) {
                    throw new BindPathError(host.tagName, parsed.raw, segment);
                }
                const obj = v as Record<string, unknown>;
                const fn = obj[segment];
                if (typeof fn !== 'function') {
                    throw new BindNotSubscribableError(host.tagName, parsed.raw, `"${segment}" is not a method`);
                }
                const args = resolveArgs(host, parsed, undefined);
                const result: unknown = (fn as (...a: unknown[]) => unknown).apply(obj, args);
                if (!isObservable(result)) {
                    throw new BindNotSubscribableError(host.tagName, parsed.raw, `method "${segment}(...)" did not return an Observable`);
                }
                return result as Observable<unknown>;
            }
            return segmentStream(host, parsed, v, segment);
        }));
    }

    if (!parsed.call) {
        const terminalIsObservable = ((): boolean => {
            let cur: unknown = walkScope(host, parsed.carets, parsed.raw);
            for (let i = 0; i < segments.length - 1; i++) {
                if (cur === null || cur === undefined) return false;
                cur = (cur as Record<string, unknown>)[segments[i]!];
            }
            if (cur === null || cur === undefined) return false;
            return isObservable((cur as Record<string, unknown>)[`${segments[segments.length - 1]!}$`]);
        })();
        if (!terminalIsObservable) {
            throw new BindNotSubscribableError(host.tagName, parsed.raw, `terminal "${segments[segments.length - 1]!}" has no $ observable — add @observable or call a method`);
        }
    }

    return stream.subscribe(onValue);
};

export interface EventInvocation {
    invoke(event: Event): void;
}

export const resolveEventHandler = (host: RxElementLike, parsed: ParsedBind): EventInvocation => {
    const scope = walkScope(host, parsed.carets, parsed.raw);
    const segments = parsed.path;
    let cur: unknown = scope;
    for (let i = 0; i < segments.length - 1; i++) {
        if (cur === null || cur === undefined) throw new BindPathError(host.tagName, parsed.raw, segments[i]!);
        cur = (cur as Record<string, unknown>)[segments[i]!];
    }
    const thisArg = cur;
    const key = segments[segments.length - 1]!;
    const fn = (thisArg as Record<string, unknown>)[key];
    if (typeof fn !== 'function') {
        throw new BindNotSubscribableError(host.tagName, parsed.raw, `"${segments.join('.')}" is not a method`);
    }
    return {
        invoke: (event: Event): void => {
            const args = parsed.call ? resolveArgs(host, parsed, event) : [event];
            (fn as (...a: unknown[]) => unknown).apply(thisArg, args);
        },
    };
};

export const resolveRefTarget = (host: RxElementLike, parsed: ParsedBind): { scope: RxElementLike; key: string } => {
    if (parsed.call) throw new BindParseError(parsed.raw, 'ref cannot be a method call');
    if (parsed.path.length !== 1) throw new BindParseError(parsed.raw, 'ref must be a single identifier');
    return { scope: walkScope(host, parsed.carets, parsed.raw), key: parsed.path[0]! };
};
