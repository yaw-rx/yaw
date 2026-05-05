/**
 * Stage 2 -- HTML-parse escape. Encodes &, <, > as entities so the HTML parser
 * treats the content as text rather than markup.
 */
export const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Stage 3 -- walker escape (block mode). Tagged template that wraps content in
 * <template>, whose children live in a detached DocumentFragment and are
 * therefore invisible to the template walker. Content is joined raw (no
 * HTML escaping) -- use this when you already have safe HTML to shield from
 * the walker. For arbitrary source text, use {@link escape}.
 *
 * Pair with {@link readInert} at the consumer.
 */
const inert = (html: string): string => `<template>${html}</template>`;

/**
 * Stage 4 -- inert read protocol. Returns the textContent of an element's
 * <template> child (as produced by {@link inert} / {@link escape}), falling
 * back to the element's own textContent if no template child is present.
 */
export const readInert = (el: Element): string => {
    const tpl = el.querySelector(':scope > template');
    if (tpl instanceof HTMLTemplateElement) return tpl.content.textContent ?? '';
    return el.textContent ?? '';
};

/**
 * Tagged template for display-safe content. Composes {@link escapeHtml} (stage 2)
 * with {@link inert} (stage 3) so the output is inert to both HTML parsing and
 * template walking. Intended pair: {@link readInert} at the consumer side.
 *
 * @example
 *   <code-block lang="ts">${escape`${source}`}</code-block>
 */
export const escape = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    inert(escapeHtml(String.raw({ raw: strings }, ...values)));
