/**
 * component.ts — component registration and application bootstrap.
 *
 * The @Component decorator defines a component. When it runs:
 *
 *   1. The template is compiled via transformTemplate — mustache bindings
 *      become <rx-text>, attribute bindings become data-rx-bind-*, event
 *      handlers become data-rx-on-*, HTML tags become rx-* mirrors, and
 *      carets are injected based on custom-element nesting depth.
 *
 *   2. The compiled template, selector, providers, and directives are
 *      stored in Maps keyed by constructor. These are the framework's
 *      metadata — populated at decoration time, read during rendering.
 *
 *   3. Styles are scoped to the component's tag and added to
 *      document.adoptedStyleSheets.
 *
 *   4. The class is registered via customElements.define. Every component
 *      is defined before any rendering happens, so any component tag can
 *      appear in any template.
 *
 * Initialization order:
 *
 *   Rendering is top-down. A parent's connectedCallback runs setupHostNode,
 *   setupInjectorAndDeps, and setupDirectives before renderTemplate creates
 *   its children via innerHTML. Children only exist after the parent is
 *   fully initialized. This guarantees parent-first ordering for the DI
 *   tree, hostNode, and directive setup.
 *
 * Recursive components:
 *
 *   A component can contain its own tag in its template. The tag is
 *   registered during the decorator, before any template renders. The
 *   browser creates the nested instance on innerHTML, its connectedCallback
 *   fires, and it renders its own children — recursing until the data
 *   runs out.
 */
import { Injector } from './di/injector.js';
import type { Provider } from './di/types.js';
import type { DirectiveCtor, RxElementLike } from './directive.js';
import { BootstrapError } from './errors.js';
import { registerHtmlMirrors } from './components/rx-elements.js';
import { transformTemplate, transformStyles } from 'yaw-common';

interface ComponentOptions {
    readonly selector: string;
    readonly template?: string;
    readonly styles?: string;
    readonly providers?: readonly Provider[];
    readonly directives?: readonly DirectiveCtor[];
}

export interface Route {
    readonly path: string;
    readonly component?: CustomElementConstructor;
    readonly redirect?: string;
}

const templateCache = new Map<Function, string>();
const rawTemplateCache = new Map<CustomElementConstructor, string>();
const selectorCache = new Map<Function, string>();
const providersCache = new Map<Function, readonly Provider[]>();
const directivesCache = new Map<Function, readonly DirectiveCtor[]>();
const stylesCache = new Map<Function, CSSStyleSheet>();

export const getTemplate = (ctor: Function): string | undefined => templateCache.get(ctor);
export const getRawTemplate = (ctor: CustomElementConstructor): string | undefined => rawTemplateCache.get(ctor);
export const getSelector = (ctor: Function): string | undefined => selectorCache.get(ctor);
export const getProviders = (ctor: Function): readonly Provider[] | undefined => providersCache.get(ctor);
export const getDirectives = (ctor: Function): readonly DirectiveCtor[] | undefined => directivesCache.get(ctor);
export const getStyles = (ctor: Function): CSSStyleSheet | undefined => stylesCache.get(ctor);

const componentCtors = new WeakSet<Function>();

export const isComponent = (ctor: Function): boolean => componentCtors.has(ctor);

export const Component = (options: ComponentOptions) =>
    (ctor: CustomElementConstructor): void => {
        componentCtors.add(ctor);
        const { template } = options;
        if (template !== undefined) {
            rawTemplateCache.set(ctor, template);
            templateCache.set(ctor, transformTemplate(template));
        }
        selectorCache.set(ctor, options.selector);
        if (options.providers !== undefined) providersCache.set(ctor, options.providers);
        if (options.directives !== undefined) directivesCache.set(ctor, options.directives);
        if (options.styles !== undefined) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(transformStyles(options.styles, options.selector));
            stylesCache.set(ctor, sheet);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
        customElements.define(options.selector, ctor);
    };


let globalDirectives: readonly DirectiveCtor[] = [];

export const getGlobalDirectives = (): readonly DirectiveCtor[] => globalDirectives;

interface BootstrapOptions {
    readonly root: CustomElementConstructor;
    readonly providers: readonly Provider[];
    readonly globalDirectives?: readonly DirectiveCtor[];
}

export const bootstrap = (options: BootstrapOptions): void => {
    const selector = getSelector(options.root);
    if (selector === undefined) { throw new BootstrapError(`${options.root.name} has no @Component decorator`); }
    registerHtmlMirrors();
    globalDirectives = options.globalDirectives ?? [];
    const injector = new Injector(options.providers);
    (document.body as RxElementLike).__injector = injector;
    document.body.appendChild(document.createElement(selector));
};
