/**
 * Minimal interface matching RxElement for use in directive code
 * without importing the full class.
 * @property {RxElementLike} hostNode - The closest `[data-rx-host]` element.
 * @property {unknown} __injector - The component's Injector instance, if any.
 */
export interface RxElementLike extends HTMLElement {
    hostNode: RxElementLike;
    __injector: unknown;
}

/**
 * A parsed binding path as seen by directives. Contains the raw
 * attribute value and any additional string keys the directive's
 * custom parser adds.
 * @property {string} raw - The original attribute value string.
 */
export interface ParsedBindingPath {
    readonly raw: string;
    readonly [key: string]: string;
}

/**
 * Instance interface for a directive. Implemented by any class
 * decorated with @Directive.
 * @property {RxElementLike} node - The element the directive is attached to.
 * @property {ParsedBindingPath} [bindingPath] - Parsed from the directive's attribute value.
 */
export interface Directive {
    node: RxElementLike;
    bindingPath?: ParsedBindingPath;
    /**
     * Custom parser for the directive's attribute value. If provided,
     * setupDirectivesFor calls this instead of the default `{ raw }` wrapper.
     * @param {string} raw - The raw attribute value string.
     * @returns {ParsedBindingPath} The parsed binding path.
     */
    parseBindingPath?(raw: string): ParsedBindingPath;
    /**
     * Called after the directive is instantiated and bindingPath is set.
     * @returns {void}
     */
    onInit(): void;
    /**
     * Called when the host element is removed from the DOM.
     * @returns {void}
     */
    onDestroy(): void;
}

/**
 * Constructor type for a directive class.
 */
export interface DirectiveCtor {
    new (...args: never[]): Directive;
}

interface DirectiveOptions {
    readonly selector: string;
}

const directiveSelectors = new Map<DirectiveCtor, string>();

export const getDirectiveSelector = (ctor: DirectiveCtor): string | undefined =>
    directiveSelectors.get(ctor);

export const matchesSelector = (el: Element, selector: string): boolean => {
    if (selector.endsWith('*]')) {
        const prefix = selector.slice(1, -2);
        return Array.from(el.attributes).some((a) => a.name.startsWith(prefix));
    }
    return el.hasAttribute(selector.slice(1, -1));
};

/**
 * Class decorator that registers a directive with its attribute selector.
 * @param {DirectiveOptions} options - Must include `selector` in `[attr]` format.
 * @returns {(ctor: DirectiveCtor, context: ClassDecoratorContext) => void} The decorator function.
 */
export const Directive = (options: DirectiveOptions) =>
    (ctor: DirectiveCtor, _context: ClassDecoratorContext): void => {
        directiveSelectors.set(ctor, options.selector);
    };
