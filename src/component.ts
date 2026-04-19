import { Injector } from './di/injector.js';
import type { Provider } from './di/types.js';
import type { DirectiveCtor } from './directive.js';
import { htmlTags } from './components/rx-elements.js';

interface ComponentOptions {
    readonly selector: string;
    readonly template: string;
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
const selectorCache = new Map<Function, string>();
const providersCache = new Map<Function, readonly Provider[]>();
const directivesCache = new Map<Function, readonly DirectiveCtor[]>();

export const getTemplate = (ctor: Function): string | undefined => templateCache.get(ctor);
export const getSelector = (ctor: Function): string | undefined => selectorCache.get(ctor);
export const getProviders = (ctor: Function): readonly Provider[] | undefined => providersCache.get(ctor);
export const getDirectives = (ctor: Function): readonly DirectiveCtor[] | undefined => directivesCache.get(ctor);

export const Component = (options: ComponentOptions) =>
    (ctor: CustomElementConstructor): void => {
        templateCache.set(ctor, transformTemplate(options.template));
        selectorCache.set(ctor, options.selector);
        if (options.providers !== undefined) providersCache.set(ctor, options.providers);
        if (options.directives !== undefined) directivesCache.set(ctor, options.directives);
        customElements.define(options.selector, ctor);
    };

const htmlTagSet = new Set(htmlTags);

const rewriteTags = (template: string): string =>
    template.replace(/<(\/?)([\w-]+)/g, (match, slash, tag) =>
        htmlTagSet.has(tag) ? `<${slash}rx-${tag}` : match
    );

const transformTemplate = (template: string): string =>
    rewriteTags(template)
        .replace(/\{\{(.+?)\}\}/g, '<rx-text bind="$1"></rx-text>')
        .replace(/\[class\.([^\]]+)\]="([^"]+)"/g, 'data-rx-class-$1="$2"')
        .replace(/\[([^\]]+)\]="([^"]+)"/g, 'data-rx-bind-$1="$2"')
        .replace(/on(\w+)="(\w+)"/g, 'data-rx-on-$1="$2"')
        .replace(/#(\w+)/g, 'data-rx-ref="$1"');

let globalDirectives: readonly DirectiveCtor[] = [];

export const getGlobalDirectives = (): readonly DirectiveCtor[] => globalDirectives;

interface BootstrapOptions {
    readonly host: Element | null;
    readonly root: CustomElementConstructor;
    readonly providers: readonly Provider[];
    readonly routes: readonly Route[];
    readonly registry: readonly CustomElementConstructor[];
    readonly globalDirectives?: readonly DirectiveCtor[];
}

export const bootstrap = (options: BootstrapOptions): void => {
    if (options.host === null) return;
    globalDirectives = options.globalDirectives ?? [];
    const injector = new Injector(options.providers);
    (options.host as unknown as { __injector: Injector }).__injector = injector;
    const selector = getSelector(options.root);
    if (selector === undefined) throw new Error(`${options.root.name} has no @Component decorator`);
    options.host.innerHTML = `<${selector}></${selector}>`;
};
