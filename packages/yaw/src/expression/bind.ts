/**
 * bind.ts — binding resolution for reactive templates.
 *
 * Parses binding expressions (like "count", "row.name", "^increment(1)")
 * and subscribes them to observable streams that push values to the DOM.
 *
 * How the binding chain works:
 *
 *   A binding like "row.name" becomes a pipeline of switchMap operations.
 *   Each segment in the path is resolved by segmentStream, which checks
 *   three things in order:
 *     1. Is obj[x] itself an Observable? Use it. (e.g. { name: of('alice') })
 *     2. Is obj[x$] an Observable? Use it. (e.g. @state creates x$)
 *     3. Neither? Wrap the plain value with of(). (e.g. { name: 'alice' })
 *
 *   switchMap connects these: when an observable segment emits a new value,
 *   everything downstream is torn down and rebuilt. of() segments emit one
 *   value and complete — but inside switchMap that's fine, because the outer
 *   subscription stays alive and re-triggers the inner on the next emission.
 *
 *   A chain of ONLY of() segments is dead — emits once, completes, never
 *   updates. That's why at least one segment must be observable: it's the
 *   live source that keeps the pipeline alive. Everything downstream of it
 *   re-evaluates when it emits. Everything upstream is a stable reference
 *   (the host object, resolved once via walkScope).
 *
 * Resolution functions:
 *
 *   parseBind — turns a binding string into carets (host boundary hops),
 *   path segments (dotted property path), and optional call/args info.
 *
 *   subscribeBind — resolves a parsed binding to a live subscription.
 *   Before walking to the host, it calls a scope hook (if one is installed).
 *   The hook can claim the first path segment by returning a BehaviorSubject
 *   and a consumed count. If it does, that subject becomes the stream root
 *   and the remaining segments pipe through switchMap. If it doesn't, the
 *   normal host walk proceeds — closest('[data-rx-host]') with caret hops.
 *
 *   resolveEventHandler — resolves methods on the host. Arguments go
 *   through the same hook for claimed names.
 *
 *   resolveRefTarget — resolves #ref assignments.
 *
 * Extension point — registerScopeHook:
 *
 *   Any directive that introduces names into its subtree can install a
 *   hook via registerScopeHook. The hook is called before the host walk
 *   on every binding. It receives the binding element and the first path
 *   segment. Return a ScopeHookResult (BehaviorSubject + consumed count)
 *   to claim it, or undefined to pass. When no hook is installed, the
 *   check is a single null comparison.
 */
import { BehaviorSubject, isObservable, of, Subscription, switchMap, skip, first, type Observable } from 'rxjs';
import { hydrationComplete$ } from '../rx-element.js';
import { BindNotSubscribableError, BindParseError, BindPathError, BindScopeError } from '../errors.js';
import { encodeAttribute } from '../attribute-codec/encode.js';

const walkPath = (root: unknown, path: readonly string[]): unknown => {
    let cur = root;
    for (const seg of path) cur = (cur as Record<string, unknown>)[seg];
    return cur;
};

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
    if (carets > 0 && cur.src[cur.pos] === '.') cur.pos++;
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

export interface ScopeHookResult {
    readonly stream: BehaviorSubject<unknown>;
    readonly consumed: number;
}

type ScopeHook = (host: Element, segment: string) => ScopeHookResult | undefined;
let scopeHook: ScopeHook | null = null;

export const registerScopeHook = (hook: ScopeHook): void => { scopeHook = hook; };

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

const nextHost = (el: Element): Element | undefined =>
    (el.parentElement?.closest('[data-rx-host]') ?? undefined) as Element | undefined;

const walkScope = (host: Element, carets: number, raw: string): Element => {
    let scope: Element | undefined = nextHost(host);
    for (let i = 0; i < carets; i++) {
        if (scope === undefined) throw new BindScopeError(host.tagName, raw, carets);
        scope = nextHost(scope);
    }
    if (scope === undefined) throw new BindScopeError(host.tagName, raw, carets);
    return scope;
};

const resolveRef = (host: Element, ref: ParsedRef, raw: string): unknown => {
    let cur: unknown;
    let startIndex: number;

    if (scopeHook !== null) {
        const claimed = scopeHook(host, ref.path[0]!);
        if (claimed !== undefined) {
            cur = claimed.stream.value;
            startIndex = claimed.consumed;
        } else {
            cur = walkScope(host, ref.carets, raw);
            startIndex = 0;
        }
    } else {
        cur = walkScope(host, ref.carets, raw);
        startIndex = 0;
    }

    for (let i = startIndex; i < ref.path.length; i++) {
        if (cur === null || cur === undefined) throw new BindPathError(host.tagName, raw, ref.path[i]!);
        cur = (cur as Record<string, unknown>)[ref.path[i]!];
    }
    return cur;
};

const resolveArgs = (host: Element, parsed: ParsedBind, event: unknown): unknown[] =>
    parsed.args.map((arg) => {
        if (arg.kind === 'literal') return arg.value;
        if (arg.kind === 'event') return event;
        return resolveRef(host, arg.ref, parsed.raw);
    });

const segmentStream = (host: Element, parsed: ParsedBind, value: unknown, segment: string): Observable<unknown> => {
    if (value === null || value === undefined) {
        throw new BindPathError(host.tagName, parsed.raw, segment);
    }
    const obj = value as Record<string, unknown>;
    if (isObservable(obj[segment])) return obj[segment] as Observable<unknown>;
    const reactive = obj[`${segment}$`];
    if (isObservable(reactive)) {
        console.log('[segmentStream]', host.tagName, parsed.raw, segment, 'reactive$ found, value=', (reactive as BehaviorSubject<unknown>).value);
        return reactive as Observable<unknown>;
    }
    if (!(segment in obj)) throw new BindPathError(host.tagName, parsed.raw, segment);
    console.log('[segmentStream]', host.tagName, parsed.raw, segment, 'plain value=', obj[segment]);
    return of(obj[segment]);
};

export const observeBind = (
    host: Element,
    parsed: ParsedBind,
): Observable<unknown> => {
    const segments = parsed.path;

    let stream: Observable<unknown>;
    let startIndex: number;
    let hasObservable: boolean;

    if (scopeHook !== null) {
        const claimed = scopeHook(host, segments[0]!);
        if (claimed !== undefined) {
            stream = claimed.stream;
            startIndex = claimed.consumed;
            hasObservable = true;
        } else {
            const scope = walkScope(host, parsed.carets, parsed.raw);
            stream = of(scope as unknown);
            startIndex = 0;
            hasObservable = false;
        }
    } else {
        const scope = walkScope(host, parsed.carets, parsed.raw);
        console.log('[observeBind]', host.tagName, parsed.raw, 'scope=', scope.tagName, 'scopeCtor=', scope.constructor.name, 'hasHue$=', 'hue$' in scope);
        stream = of(scope as unknown);
        startIndex = 0;
        hasObservable = false;
    }

    // Chain-reactive rule: the switchMap pipeline needs at least one observable
    // segment to stay alive. A chain of only of() segments emits once and dies.
    // The observable segment is the live source — everything downstream of it
    // re-evaluates when it emits. The scope hook satisfies this by construction
    // (the BehaviorSubject IS the observable root). For host-mode bindings, we
    // walk the path synchronously to verify at least one segment is reactive.
    if (!hasObservable && !parsed.call) {
        const scope = walkScope(host, parsed.carets, parsed.raw);
        let cur: unknown = scope;
        for (let i = startIndex; i < segments.length; i++) {
            if (cur === null || cur === undefined) break;
            const obj = cur as Record<string, unknown>;
            if (isObservable(obj[segments[i]!]) || isObservable(obj[`${segments[i]!}$`])) {
                hasObservable = true;
                break;
            }
            cur = obj[segments[i]!];
        }
        if (!hasObservable) {
            throw new BindNotSubscribableError(
                host.tagName, parsed.raw,
                `no observable segment in chain — add @state or use a reactive source`,
            );
        }
    }

    for (let i = startIndex; i < segments.length; i++) {
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

    return stream;
};

export const subscribeBind = (
    host: Element,
    parsed: ParsedBind,
    onValue: (v: unknown) => void,
): Subscription => observeBind(host, parsed).subscribe(onValue);

export const resolveEncoder = (
    host: Element,
    parsed: ParsedBind,
): ((v: unknown) => string) => {
    if (parsed.path.length !== 1) return String;
    const scope = walkScope(host, parsed.carets, parsed.raw);
    const typeMap = (scope.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
    const typeName = typeMap?.[parsed.path[0]!];
    if (typeName === undefined) return String;
    const key = parsed.path[0]!;
    return (v) => encodeAttribute(typeName, key, v);
};

export const hydratedBind = (
    host: Element,
    parsed: ParsedBind,
): Observable<unknown> =>
    hydrationComplete$.pipe(first(), switchMap(() => observeBind(host, parsed).pipe(skip(1))));

export interface EventInvocation {
    invoke(event: Event): void;
}

export const resolveEventHandler = (host: Element, parsed: ParsedBind): EventInvocation => {
    const segments = parsed.path;
    let cur: unknown;
    let startIndex: number;

    if (scopeHook !== null) {
        const claimed = scopeHook(host, segments[0]!);
        if (claimed !== undefined) {
            cur = claimed.stream.value;
            startIndex = claimed.consumed;
        } else {
            cur = walkScope(host, parsed.carets, parsed.raw);
            startIndex = 0;
        }
    } else {
        cur = walkScope(host, parsed.carets, parsed.raw);
        startIndex = 0;
    }

    for (let i = startIndex; i < segments.length - 1; i++) {
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

export const resolveRefTarget = (host: Element, parsed: ParsedBind): { scope: Element; key: string } => {
    if (parsed.call) throw new BindParseError(parsed.raw, 'ref cannot be a method call');
    if (parsed.path.length !== 1) throw new BindParseError(parsed.raw, 'ref must be a single identifier');
    return { scope: walkScope(host, parsed.carets, parsed.raw), key: parsed.path[0]! };
};

export const resolveValue = (host: Element, parsed: ParsedBind): unknown => {
    if (parsed.call) throw new BindParseError(parsed.raw, 'cannot read value from a method call');
    let cur: unknown;
    let startIndex: number;
    if (scopeHook !== null) {
        const claimed = scopeHook(host, parsed.path[0]!);
        if (claimed !== undefined) {
            cur = claimed.stream.value;
            startIndex = claimed.consumed;
        } else {
            cur = walkScope(host, parsed.carets, parsed.raw);
            startIndex = 0;
        }
    } else {
        cur = walkScope(host, parsed.carets, parsed.raw);
        startIndex = 0;
    }
    for (let i = startIndex; i < parsed.path.length; i++) {
        if (cur === null || cur === undefined) throw new BindPathError(host.tagName, parsed.raw, parsed.path[i]!);
        cur = (cur as Record<string, unknown>)[parsed.path[i]!];
    }
    return cur;
};

export const resolveWriteTarget = (host: Element, parsed: ParsedBind): (value: unknown) => void => {
    if (parsed.call) throw new BindParseError(parsed.raw, 'model binding cannot be a method call');
    const root = walkScope(host, parsed.carets, parsed.raw);
    const target = walkPath(root, parsed.path.slice(0, -1));
    const key = parsed.path.at(-1);
    if (key === undefined) throw new BindParseError(parsed.raw, 'empty path');
    return (value: unknown): void => { (target as Record<string, unknown>)[key] = value; };
};
