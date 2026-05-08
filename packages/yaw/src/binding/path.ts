/**
 * path.ts - binding path resolution for reactive templates.
 *
 * Parses binding paths (like "count", "row.name", "^increment(1)")
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
 *   value and complete - but inside switchMap that's fine, because the outer
 *   subscription stays alive and re-triggers the inner on the next emission.
 *
 *   A chain of all plain values emits once via of() and completes - a
 *   valid one-shot binding. When at least one segment is observable, it
 *   keeps the pipeline alive and downstream segments re-evaluate on each
 *   emission. Upstream segments are stable references resolved once via
 *   walkScope.
 *
 * Resolution functions:
 *
 *   parseBindingPath - turns a binding string into carets (host boundary hops),
 *   path segments (dotted property path), and optional call/args info.
 *
 *   subscribeToBinding - resolves a parsed binding to a live subscription.
 *   Before walking to the host, it calls a scope hook (if one is installed).
 *   The hook can claim the first path segment by returning a BehaviorSubject
 *   and a consumed count. If it does, that subject becomes the stream root
 *   and the remaining segments pipe through switchMap. If it doesn't, the
 *   normal host walk proceeds - closest('[data-rx-host]') with caret hops.
 *
 *   resolveEventHandler - resolves methods on the host. Arguments go
 *   through the same hook for claimed names.
 *
 *   resolveRefTarget - resolves #ref assignments.
 *
 * Extension point - registerScopeHook (binding/hooks/scope.ts):
 *
 *   Any directive that introduces names into its subtree registers a
 *   hook via registerScopeHook. Hooks are checked in registration order
 *   before the host walk on every binding. Each receives the binding
 *   element and the first path segment. Return a ScopeHookResult
 *   (BehaviorSubject + consumed count) to claim it, or undefined to
 *   pass. The first hook to claim wins.
 */
import { of, Subscription, switchMap, skip, first, type Observable } from 'rxjs';
import { isObservable } from '../classify/is-observable.js';
import { hydrationComplete$ } from '../hydrate/state.js';
import { BindingNotSubscribableError, BindingParseError, BindingPathError, BindingScopeError } from '../errors.js';
import { encodeAttribute } from '../attribute-codec/encode.js';
import { scopeHooks } from './hooks/scope.js';

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

export interface ParsedBinding extends ParsedRef {
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
        throw new BindingParseError(raw, `expected identifier at position ${cur.pos}`);
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
        if (cur.pos >= cur.src.length) throw new BindingParseError(raw, 'unterminated string literal');
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
        if (cur.src.slice(cur.pos, cur.pos + 6) !== '$event') throw new BindingParseError(raw, 'expected "$event"');
        cur.pos += 6;
        return { kind: 'event' };
    }
    if (cur.src.startsWith('true', cur.pos)) { cur.pos += 4; return { kind: 'literal', value: true }; }
    if (cur.src.startsWith('false', cur.pos)) { cur.pos += 5; return { kind: 'literal', value: false }; }
    if (cur.src.startsWith('null', cur.pos)) { cur.pos += 4; return { kind: 'literal', value: null }; }
    return { kind: 'ref', ref: parseRef(cur, raw) };
};


const cache = new Map<string, ParsedBinding>();

export const parseBindingPath = (raw: string): ParsedBinding => {
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
            if (!cur.eat(')')) throw new BindingParseError(raw, 'expected ")"');
        }
    }
    if (!cur.atEnd()) throw new BindingParseError(raw, `unexpected input at position ${cur.pos}`);

    const bindingPath: ParsedBinding = { raw, carets: ref.carets, path: ref.path, call, args };
    cache.set(raw, bindingPath);
    return bindingPath;
};

const nextHost = (el: Element): Element | undefined => {
    const hostNode = (el as unknown as { hostNode?: Element }).hostNode;
    if (hostNode !== undefined) return hostNode;
    return (el.parentElement?.closest('[data-rx-host]') ?? undefined) as Element | undefined;
};

const walkScope = (host: Element, carets: number, raw: string): Element => {
    let scope: Element | undefined = nextHost(host);
    for (let i = 0; i < carets; i++) {
        if (scope === undefined) throw new BindingScopeError(host.tagName, raw, carets);
        scope = nextHost(scope);
    }
    if (scope === undefined) throw new BindingScopeError(host.tagName, raw, carets);
    return scope;
};

interface ResolvedScope {
    readonly root: unknown;
    readonly startIndex: number;
}

const resolveScope = (host: Element, ref: ParsedRef, raw: string): ResolvedScope => {
    for (const hook of scopeHooks) {
        const claimed = hook(host, ref.path[0]!);
        if (claimed !== undefined) return { root: claimed.stream.value, startIndex: claimed.consumed };
    }
    return { root: walkScope(host, ref.carets, raw), startIndex: 0 };
};

const resolveScopeStream = (host: Element, ref: ParsedRef, raw: string): { stream: Observable<unknown>; startIndex: number; hooked: boolean } => {
    for (const hook of scopeHooks) {
        const claimed = hook(host, ref.path[0]!);
        if (claimed !== undefined) return { stream: claimed.stream, startIndex: claimed.consumed, hooked: true };
    }
    return { stream: of(walkScope(host, ref.carets, raw) as unknown), startIndex: 0, hooked: false };
};

const resolveRef = (host: Element, ref: ParsedRef, raw: string): unknown => {
    const { root, startIndex } = resolveScope(host, ref, raw);
    let cur = root;
    for (let i = startIndex; i < ref.path.length; i++) {
        if (cur === null || cur === undefined) throw new BindingPathError(host.tagName, raw, ref.path[i]!);
        cur = (cur as Record<string, unknown>)[ref.path[i]!];
    }
    return cur;
};

const resolveArgs = (host: Element, bindingPath: ParsedBinding, event: unknown): unknown[] =>
    bindingPath.args.map((arg) => {
        if (arg.kind === 'literal') return arg.value;
        if (arg.kind === 'event') return event;
        return resolveRef(host, arg.ref, bindingPath.raw);
    });

const segmentStream = (host: Element, bindingPath: ParsedBinding, value: unknown, segment: string): Observable<unknown> => {
    if (value === null || value === undefined) {
        throw new BindingPathError(host.tagName, bindingPath.raw, segment);
    }
    const obj = value as Record<string, unknown>;
    if (isObservable(obj[segment])) return obj[segment] as Observable<unknown>;
    const reactive = obj[`${segment}$`];
    if (isObservable(reactive)) return reactive as Observable<unknown>;
    if (!(segment in obj)) throw new BindingPathError(host.tagName, bindingPath.raw, segment);
    return of(obj[segment]);
};

export const observeBinding = (
    host: Element,
    bindingPath: ParsedBinding,
): Observable<unknown> => {
    const segments = bindingPath.path;
    const { stream: initial, startIndex, hooked } = resolveScopeStream(host, bindingPath, bindingPath.raw);
    let stream: Observable<unknown> = initial;

    if (!hooked && !bindingPath.call) {
        const { root } = resolveScope(host, bindingPath, bindingPath.raw);
        let cur: unknown = root;
        for (let i = startIndex; i < segments.length; i++) {
            if (cur === null || cur === undefined) break;
            const obj = cur as Record<string, unknown>;
            const seg = segments[i]!;
            if (isObservable(obj[seg]) || isObservable(obj[`${seg}$`])) break;
            if (!(seg in obj)) {
                throw new BindingPathError(host.tagName, bindingPath.raw, seg);
            }
            cur = obj[seg];
        }
    }

    for (let i = startIndex; i < segments.length; i++) {
        const segment = segments[i]!;
        const isLast = i === segments.length - 1;
        stream = stream.pipe(switchMap((v) => {
            if (isLast && bindingPath.call) {
                if (v === null || v === undefined) {
                    throw new BindingPathError(host.tagName, bindingPath.raw, segment);
                }
                const obj = v as Record<string, unknown>;
                const fn = obj[segment];
                if (typeof fn !== 'function') {
                    throw new BindingNotSubscribableError(host.tagName, bindingPath.raw, `"${segment}" is not a method`);
                }
                const args = resolveArgs(host, bindingPath, undefined);
                const result: unknown = (fn as (...a: unknown[]) => unknown).apply(obj, args);
                if (!isObservable(result)) {
                    throw new BindingNotSubscribableError(host.tagName, bindingPath.raw, `method "${segment}(...)" did not return an Observable`);
                }
                return result as Observable<unknown>;
            }
            return segmentStream(host, bindingPath, v, segment);
        }));
    }

    return stream;
};

export const subscribeToBinding = (
    host: Element,
    bindingPath: ParsedBinding,
    onValue: (v: unknown) => void,
): Subscription => observeBinding(host, bindingPath).subscribe(onValue);

export const resolveEncoder = (
    host: Element,
    bindingPath: ParsedBinding,
): ((v: unknown) => string) => {
    if (bindingPath.path.length !== 1) return String;
    const scope = walkScope(host, bindingPath.carets, bindingPath.raw);
    const typeMap = (scope.constructor as unknown as Record<string, unknown>)['__stateTypes'] as Record<string, string> | undefined;
    const typeName = typeMap?.[bindingPath.path[0]!];
    if (typeName === undefined) return String;
    const key = bindingPath.path[0]!;
    return (v) => encodeAttribute(typeName, key, v);
};

export const hydratedBinding = (
    host: Element,
    bindingPath: ParsedBinding,
): Observable<unknown> =>
    hydrationComplete$.pipe(first(), switchMap(() => observeBinding(host, bindingPath).pipe(skip(1))));

export const deferredBinding = (
    host: Element,
    bindingPath: ParsedBinding,
): Observable<unknown> =>
    hydrationComplete$.pipe(first(), switchMap(() => observeBinding(host, bindingPath)));

export interface EventInvocation {
    invoke(event: Event): void;
}

export const resolveEventHandler = (host: Element, bindingPath: ParsedBinding): EventInvocation => {
    const segments = bindingPath.path;
    const { root, startIndex } = resolveScope(host, bindingPath, bindingPath.raw);
    let cur: unknown = root;

    for (let i = startIndex; i < segments.length - 1; i++) {
        if (cur === null || cur === undefined) throw new BindingPathError(host.tagName, bindingPath.raw, segments[i]!);
        cur = (cur as Record<string, unknown>)[segments[i]!];
    }
    const thisArg = cur;
    const key = segments[segments.length - 1]!;
    const fn = (thisArg as Record<string, unknown>)[key];
    if (typeof fn !== 'function') {
        throw new BindingNotSubscribableError(host.tagName, bindingPath.raw, `"${segments.join('.')}" is not a method`);
    }
    return {
        invoke: (event: Event): void => {
            const args = bindingPath.call ? resolveArgs(host, bindingPath, event) : [event];
            (fn as (...a: unknown[]) => unknown).apply(thisArg, args);
        },
    };
};

export const resolveRefTarget = (host: Element, bindingPath: ParsedBinding): { scope: Element; key: string } => {
    if (bindingPath.call) throw new BindingParseError(bindingPath.raw, 'ref cannot be a method call');
    if (bindingPath.path.length !== 1) throw new BindingParseError(bindingPath.raw, 'ref must be a single identifier');
    return { scope: walkScope(host, bindingPath.carets, bindingPath.raw), key: bindingPath.path[0]! };
};

export const resolveValue = (host: Element, bindingPath: ParsedBinding): unknown => {
    if (bindingPath.call) throw new BindingParseError(bindingPath.raw, 'cannot read value from a method call');
    return resolveRef(host, bindingPath, bindingPath.raw);
};

export const resolveWriteTarget = (host: Element, bindingPath: ParsedBinding): (value: unknown) => void => {
    if (bindingPath.call) throw new BindingParseError(bindingPath.raw, 'tap binding cannot be a method call');
    const root = walkScope(host, bindingPath.carets, bindingPath.raw);
    const target = walkPath(root, bindingPath.path.slice(0, -1));
    const key = bindingPath.path.at(-1);
    if (key === undefined) throw new BindingParseError(bindingPath.raw, 'empty path');
    return (value: unknown): void => { (target as Record<string, unknown>)[key] = value; };
};
