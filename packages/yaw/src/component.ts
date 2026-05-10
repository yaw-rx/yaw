/**
 * component.ts - component registration and application bootstrap.
 *
 * The @Component decorator defines a component. When it runs:
 *
 *   1. The template is compiled via transformTemplate - mustache bindings
 *      become <span data-rx-bind-text>, attribute bindings become
 *      data-rx-bind-*, event handlers become data-rx-on-*, and carets
 *      are injected based on custom-element nesting depth.
 *
 *   2. The compiled template, selector, providers, and directives are
 *      stored in Maps keyed by constructor. These are the framework's
 *      metadata - populated at decoration time, read during rendering.
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
 *   Rendering is top-down. A host's connectedCallback runs setupHostNode,
 *   setupInjectorAndDeps, and setupDirectives before renderTemplate creates
 *   its children via innerHTML. Children only exist after the host is
 *   fully initialized. This guarantees host-first ordering for the DI
 *   tree, hostNode, and directive setup.
 *
 * Recursive components:
 *
 *   A component can contain its own tag in its template. The tag is
 *   registered during the decorator, before any template renders. The
 *   browser creates the nested instance on innerHTML, its connectedCallback
 *   fires, and it renders its own children - recursing until the data
 *   runs out.
 */
import { Injector } from './di/injector.js';
import type { Provider } from './di/types.js';
import type { DirectiveCtor, RxElementLike } from './directive.js';
import { BootstrapError, HydrationError } from './errors.js';
import { setHydrating, isHydrating } from './hydrate/state.js';
import { transformTemplate, transformStyles } from '@yaw-rx/common/transform';
import type { AttributeCodec } from './attribute-codec/types.js';
import { registerAttributeCodecs } from './attribute-codec/registry.js';
import { startObserver, flushExistingBindings } from './binding/native.js';
import { getStateKeys } from './state.js';
import { isObservable } from './classify/is-observable.js';
import { encodeAttribute } from './attribute-codec/encode.js';

/**
 * Configuration for the @Component decorator.
 * @property {string} selector - The custom element tag name (e.g. 'my-app').
 * @property {string} [template] - HTML template string, compiled by transformTemplate.
 * @property {string} [styles] - CSS string, scoped to the selector via transformStyles.
 * @property {readonly Provider[]} [providers] - DI providers local to this component.
 * @property {readonly DirectiveCtor[]} [directives] - Directive constructors active in this component's subtree.
 * @property {Record<string, AttributeCodec>} [attributeCodecs] - Custom codecs for typed attribute marshalling.
 */
export interface ComponentOptions {
    readonly selector: string;
    readonly template?: string;
    readonly styles?: string;
    readonly providers?: readonly Provider[];
    readonly directives?: readonly DirectiveCtor[];
    readonly attributeCodecs?: Record<string, AttributeCodec>;
}

/**
 * A route entry for the router.
 * @property {string} path - The URL path to match (e.g. '/docs').
 * @property {() => Promise<CustomElementConstructor>} [load] - Lazy loader returning the page component.
 * @property {string} [redirect] - Redirect target path.
 */
export interface Route {
    readonly path: string;
    readonly load?: () => Promise<CustomElementConstructor>;
    readonly redirect?: string;
}

const templateCache = new Map<Function, string>();
const rawTemplateCache = new Map<CustomElementConstructor, string>();
const selectorCache = new Map<Function, string>();
const providersCache = new Map<Function, readonly Provider[]>();
const directivesCache = new Map<Function, readonly DirectiveCtor[]>();
const stylesCache = new Map<Function, CSSStyleSheet>();
const codecsCache = new Map<Function, Record<string, AttributeCodec>>();

export const getTemplate = (ctor: Function): string | undefined => templateCache.get(ctor);

const parsedTemplateCache = new Map<Function, HTMLTemplateElement>();

export const getParsedTemplate = (ctor: Function): HTMLTemplateElement | undefined => {
    let tpl = parsedTemplateCache.get(ctor);
    if (tpl !== undefined) return tpl;
    const html = templateCache.get(ctor);
    if (html === undefined) return undefined;
    tpl = document.createElement('template');
    tpl.innerHTML = html;
    parsedTemplateCache.set(ctor, tpl);
    return tpl;
};
/**
 * Returns the original (pre-transformation) template string for a component.
 * @param {CustomElementConstructor} ctor - The component constructor.
 * @returns {string | undefined} The raw template, or undefined if none was declared.
 */
export const getRawTemplate = (ctor: CustomElementConstructor): string | undefined => rawTemplateCache.get(ctor);
export const getSelector = (ctor: Function): string | undefined => selectorCache.get(ctor);
export const getProviders = (ctor: Function): readonly Provider[] | undefined => providersCache.get(ctor);
export const getDirectives = (ctor: Function): readonly DirectiveCtor[] | undefined => directivesCache.get(ctor);
export const getStyles = (ctor: Function): CSSStyleSheet | undefined => stylesCache.get(ctor);
export const getAttributeCodecs = (ctor: Function): Record<string, AttributeCodec> | undefined => codecsCache.get(ctor);

export const getComponentOptions = (ctor: Function): ComponentOptions | undefined => {
    const selector = selectorCache.get(ctor);
    if (selector === undefined) return undefined;
    const opts: ComponentOptions = { selector };
    const template = rawTemplateCache.get(ctor as CustomElementConstructor);
    if (template !== undefined) (opts as { template: string }).template = template;
    const providers = providersCache.get(ctor);
    if (providers !== undefined) (opts as { providers: readonly Provider[] }).providers = providers;
    const directives = directivesCache.get(ctor);
    if (directives !== undefined) (opts as { directives: readonly DirectiveCtor[] }).directives = directives;
    const codecs = codecsCache.get(ctor);
    if (codecs !== undefined) (opts as { attributeCodecs: Record<string, AttributeCodec> }).attributeCodecs = codecs;
    return opts;
};

const componentCtors = new WeakSet<Function>();
const deferredDefines = new Map<string, CustomElementConstructor>();
const hydrateMode = (globalThis as Record<string, unknown>)['__yaw_hydrate'] === true;

export const isComponent = (ctor: Function): boolean => componentCtors.has(ctor);

/**
 * Class decorator that registers a custom element. Compiles the
 * template, scopes styles, stores metadata, and calls
 * customElements.define.
 * @param {ComponentOptions} options - Component configuration.
 * @returns {(ctor: CustomElementConstructor, context: ClassDecoratorContext) => void} The decorator function.
 */
export const Component = (options: ComponentOptions) =>
    (ctor: CustomElementConstructor, _context: ClassDecoratorContext): void => {
        componentCtors.add(ctor);
        const { template } = options;
        if (template !== undefined) {
            rawTemplateCache.set(ctor, template);
            templateCache.set(ctor, transformTemplate(template));
        }
        selectorCache.set(ctor, options.selector);
        if (options.providers !== undefined) providersCache.set(ctor, options.providers);
        if (options.directives !== undefined) directivesCache.set(ctor, options.directives);
        if (options.attributeCodecs !== undefined) {
            codecsCache.set(ctor, options.attributeCodecs);
            registerAttributeCodecs(options.attributeCodecs);
        }
        if (options.styles !== undefined) {
            (ctor as unknown as Record<string, unknown>)['styles'] = options.styles;
        }
        const inherited: string[] = [];
        let proto = Object.getPrototypeOf(ctor);
        while (proto !== null) {
            if ('styles' in proto && typeof proto.styles === 'string') inherited.push(proto.styles);
            proto = Object.getPrototypeOf(proto);
        }
        const combined = inherited.length > 0
            ? inherited.reverse().join('\n') + (options.styles ? '\n' + options.styles : '')
            : options.styles;
        if (combined) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(transformStyles(combined, options.selector));
            stylesCache.set(ctor, sheet);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
        if (hydrateMode && isHydrating()) {
            deferredDefines.set(options.selector, ctor);
        } else {
            customElements.define(options.selector, ctor);
        }
    };


let globalDirectives: readonly DirectiveCtor[] = [];
let ssgMode = false;

export const getGlobalDirectives = (): readonly DirectiveCtor[] => globalDirectives;
export const isSSGCapture = (): boolean => ssgMode;

/**
 * Global configuration passed to bootstrap.
 * @property {readonly DirectiveCtor[]} [directives] - Directives available in every component's subtree.
 * @property {Record<string, AttributeCodec>} [attributeCodecs] - Codecs registered globally for attribute marshalling.
 * @property {string} [styles] - Global CSS applied to document.adoptedStyleSheets.
 */
export interface BootstrapGlobals {
    readonly directives?: readonly DirectiveCtor[];
    readonly attributeCodecs?: Record<string, AttributeCodec>;
    readonly styles?: string;
}

interface BootstrapOptions {
    readonly root: CustomElementConstructor;
    readonly providers: readonly Provider[];
    readonly globals?: BootstrapGlobals;
    readonly ssg?: boolean;
    readonly hydrate?: boolean;
}

/**
 * Initializes the application. Creates the root injector, registers
 * global codecs and styles, starts the MutationObserver, and appends
 * the root component to document.body. In hydration mode, loads the
 * SSG state blob and flushes existing bindings instead.
 * @param {BootstrapOptions} options - Root component, providers, globals, and SSG/hydration flags.
 * @returns {Promise<void>} Resolves when initialization is complete.
 */
export const bootstrap = async (options: BootstrapOptions): Promise<void> => {
    const selector = getSelector(options.root);
    if (selector === undefined) { throw new BootstrapError(`${options.root.name} has no @Component decorator`); }
    if (options.globals?.attributeCodecs !== undefined) { registerAttributeCodecs(options.globals.attributeCodecs); }
    if (options.globals?.styles !== undefined) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(options.globals.styles);
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    globalDirectives = options.globals?.directives ?? [];
    ssgMode = options.ssg === true || (globalThis as Record<string, unknown>)['__yaw_ssg'] === true;
    if (ssgMode) {
        (globalThis as Record<string, unknown>)['__yaw_ssg_internals'] = {
            getStateKeys,
            isObservable,
            encodeAttribute,
            Injector,
        };
    }
    const injector = new Injector(options.providers ?? []);
    (document.body as RxElementLike).__injector = injector;
    if (hydrateMode) {
        const { loadHydrationState } = await import('./hydrate/bootstrap.js');
        loadHydrationState();
        setHydrating(true);
        if (document.body.querySelector(selector) === null) { throw new HydrationError(`no existing <${selector}> found in DOM`); }
        const raw = window.location.pathname;
        if (raw.length > 1 && raw.endsWith('/')) {
            history.replaceState(null, '', raw.slice(0, -1) + window.location.search + window.location.hash);
        }
        const routes: Route[] = [];
        for (const p of options.providers) {
            if (typeof p === 'object' && p !== null && 'useValue' in p && Array.isArray(p.useValue)) {
                for (const r of p.useValue as unknown[]) {
                    if (r !== null && typeof r === 'object' && 'path' in r) routes.push(r as Route);
                }
            }
        }
        const path = window.location.pathname;
        const match = routes.find(r => r.load !== undefined && path === r.path)
            ?? routes.find(r => r.load !== undefined && r.path !== '*' && path.startsWith(r.path + '/'));
        const endHydration = async (): Promise<void> => {
            setHydrating(false);
            const { stripSsgAttributes } = await import('./hydrate/bootstrap.js');
            stripSsgAttributes();
        };
        if (match?.load !== undefined) {
            await match.load();
            hydrateDefineAll();
            await endHydration();
            return;
        }
        hydrateDefineAll();
        await endHydration();
    } else {
        startObserver();
        document.body.appendChild(document.createElement(selector));
    }
};

const hydrateDefineAll = (): void => {
    for (const [sel, ctor] of deferredDefines) {
        if (!customElements.get(sel)) customElements.define(sel, ctor);
    }
    flushExistingBindings();
    startObserver();
};
