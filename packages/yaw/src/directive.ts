export interface RxElementLike extends HTMLElement {
    hostNode: RxElementLike;
    __injector: unknown;
}

export interface ParsedExpr {
    readonly expr: string;
    readonly [key: string]: string;
}

export interface Directive {
    node: RxElementLike;
    parsed?: ParsedExpr;
    parseExpr?(raw: string): ParsedExpr;
    onInit(): void;
    onDestroy(): void;
}

export interface DirectiveCtor {
    new (...args: never[]): Directive;
}

interface DirectiveOptions {
    readonly selector: string;
}

const directiveSelectors = new Map<DirectiveCtor, string>();

export const getDirectiveSelector = (ctor: DirectiveCtor): string | undefined =>
    directiveSelectors.get(ctor);

export const matchesSelector = (el: RxElementLike, selector: string): boolean => {
    if (selector.endsWith('*]')) {
        const prefix = selector.slice(1, -2);
        return Array.from(el.attributes).some((a) => a.name.startsWith(prefix));
    }
    return el.hasAttribute(selector.slice(1, -1));
};

export const Directive = (options: DirectiveOptions) =>
    (ctor: DirectiveCtor, _context: ClassDecoratorContext): void => {
        directiveSelectors.set(ctor, options.selector);
    };
