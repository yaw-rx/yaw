import { isObservable, of, Subscription, switchMap, type Observable } from 'rxjs';
import { BindNotSubscribableError, BindParseError, BindPathError, BindScopeError } from '../errors.js';
import type { RxElementLike } from '../directive.js';

export interface ParsedBind {
    readonly raw: string;
    readonly carets: number;
    readonly path: readonly string[];
    readonly call: boolean;
}

const BIND_RE = /^(?:(\^+)\.)?([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)(\(\))?$/;

const cache = new Map<string, ParsedBind>();

export const parseBind = (raw: string): ParsedBind => {
    const hit = cache.get(raw);
    if (hit !== undefined) return hit;

    const trimmed = raw.trim();
    const m = BIND_RE.exec(trimmed);
    if (m === null) throw new BindParseError(raw, 'expected [^+.]ident(.ident)*[()]');

    const parsed: ParsedBind = {
        raw,
        carets: m[1]?.length ?? 0,
        path: m[2]!.split('.'),
        call: m[3] === '()',
    };
    cache.set(raw, parsed);
    return parsed;
};

const resolveScope = (host: RxElementLike, parsed: ParsedBind): RxElementLike => {
    let scope: RxElementLike | undefined = host.parentRef;
    for (let i = 0; i < parsed.carets; i++) {
        if (scope === undefined) throw new BindScopeError(host.tagName, parsed.raw, parsed.carets);
        scope = scope.parentRef;
    }
    if (scope === undefined) throw new BindScopeError(host.tagName, parsed.raw, parsed.carets);
    return scope;
};

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
    const scope = resolveScope(host, parsed);
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
                const result: unknown = (fn as (...args: unknown[]) => unknown).call(obj);
                if (!isObservable(result)) {
                    throw new BindNotSubscribableError(host.tagName, parsed.raw, `method "${segment}()" did not return an Observable`);
                }
                return result as Observable<unknown>;
            }
            return segmentStream(host, parsed, v, segment);
        }));
    }

    if (!parsed.call) {
        const terminalIsObservable = ((): boolean => {
            const s = resolveScope(host, parsed);
            let cur: unknown = s;
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

export const resolveMethodOnScope = (host: RxElementLike, parsed: ParsedBind): { scope: RxElementLike; fn: (...args: unknown[]) => unknown } => {
    const scope = resolveScope(host, parsed);
    let cur: unknown = scope;
    for (let i = 0; i < parsed.path.length - 1; i++) {
        if (cur === null || cur === undefined) throw new BindPathError(host.tagName, parsed.raw, parsed.path[i]!);
        cur = (cur as Record<string, unknown>)[parsed.path[i]!];
    }
    const terminal = (cur as Record<string, unknown>)[parsed.path[parsed.path.length - 1]!];
    if (typeof terminal !== 'function') {
        throw new BindNotSubscribableError(host.tagName, parsed.raw, `"${parsed.path.join('.')}" is not a method`);
    }
    return { scope, fn: terminal as (...args: unknown[]) => unknown };
};

export const resolveRefTarget = (host: RxElementLike, parsed: ParsedBind): { scope: RxElementLike; key: string } => {
    if (parsed.call) throw new BindParseError(parsed.raw, 'ref cannot be a method call');
    if (parsed.path.length !== 1) throw new BindParseError(parsed.raw, 'ref must be a single identifier');
    return { scope: resolveScope(host, parsed), key: parsed.path[0]! };
};
