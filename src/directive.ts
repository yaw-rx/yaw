import type { RxElementLike } from './registry.js';

export interface ParsedExpr {
    readonly expr: string;
    readonly [key: string]: string;
}

export interface Directive {
    host: RxElementLike;
    parsed?: ParsedExpr;
    parseExpr?(raw: string): ParsedExpr;
    onInit(): void;
    onDestroy(): void;
}

export interface DirectiveCtor {
    new (...args: unknown[]): Directive;
}

interface DirectiveOptions {
    readonly selector: string;
}

const directiveSelectors = new Map<DirectiveCtor, string>();

export const getDirectiveSelector = (ctor: DirectiveCtor): string | undefined =>
    directiveSelectors.get(ctor);

export const Directive = (options: DirectiveOptions) =>
    (ctor: DirectiveCtor): void => {
        directiveSelectors.set(ctor, options.selector);
    };
