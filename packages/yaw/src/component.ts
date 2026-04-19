import { Injector } from './di/injector.js';
import type { Provider } from './di/types.js';
import type { DirectiveCtor, RxElementLike } from './directive.js';
import { BindDirective } from './directives/bind.js';
import { ClassBindDirective } from './directives/class-bind.js';
import { EventsDirective } from './directives/events.js';
import { RefsDirective } from './directives/refs.js';
import { BootstrapError } from './errors.js';
import { registerHtmlMirrors } from './components/rx-elements.js';
import { transformTemplate, transformStyles } from 'yaw-common';

const systemDirectives: readonly DirectiveCtor[] = [
    BindDirective,
    ClassBindDirective,
    EventsDirective,
    RefsDirective,
];

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

export const Component = (options: ComponentOptions) =>
    (ctor: CustomElementConstructor): void => {
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
    globalDirectives = [...systemDirectives, ...(options.globalDirectives ?? [])];
    const injector = new Injector(options.providers);
    (document.body as RxElementLike).__injector = injector;
    document.body.appendChild(document.createElement(selector));
};
