export declare const marshaller: import("./bind-marshaller/bind-marshaller.js").BindMarshaller;
export declare const htmlTags: readonly ["a", "abbr", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "blockquote", "br", "button", "canvas", "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu", "meter", "nav", "object", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "s", "samp", "search", "section", "select", "slot", "small", "source", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "u", "ul", "var", "video", "wbr"];
export declare const mirrorStyles: ReadonlyMap<string, string>;
export declare const transformStyles: (css: string, host?: string) => string;
/**
 * Thrown by the template walker when input cannot be compiled to a valid binding.
 * The message names the offending syntax and points to the intended fix.
 */
export declare class TemplateWalkError extends Error {
    constructor(message: string);
}
/**
 * Compiles a template string into its runtime form.
 *
 * The walker performs these rewrites on the parsed DOM:
 *   - Text nodes:  {{expr}}              => <rx-text bind="expr">
 *   - Attributes:  [attr]="expr"         => data-rx-bind-{attr}
 *                  [class.name]="expr"   => data-rx-class-{name}
 *                  onEvent="handler"     => data-rx-on-{event}
 *                  #ref                  => data-rx-ref="ref"
 *   - Tags:        built-in HTML tags    => rx-{tag} (mirror elements)
 *   - Expressions: up-walk carets "^" are injected for nested custom-element scopes.
 *
 * To display content verbatim (without any of the above), wrap it with {@link escape}
 * and read it with {@link readInert}. The walker does not traverse <template>.content.
 */
export declare const transformTemplate: (template: string) => string;
/**
 * Stage 2 -- HTML-parse escape. Encodes &, <, > as entities so the HTML parser
 * treats the content as text rather than markup.
 */
export declare const escapeHtml: (s: string) => string;
/**
 * Stage 4 -- inert read protocol. Returns the textContent of an element's
 * <template> child (as produced by {@link inert} / {@link escape}), falling
 * back to the element's own textContent if no template child is present.
 */
export declare const readInert: (el: Element) => string;
/**
 * Tagged template for display-safe content. Composes {@link escapeHtml} (stage 2)
 * with {@link inert} (stage 3) so the output is inert to both HTML parsing and
 * template walking. Intended pair: {@link readInert} at the consumer side.
 *
 * @example
 *   <code-block lang="ts">${escape`${source}`}</code-block>
 */
export declare const escape: (strings: TemplateStringsArray, ...values: readonly unknown[]) => string;
