import { RxElementBase } from '../rx-element.js';

export const htmlTags = [
    'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
    'b', 'bdi', 'bdo', 'blockquote', 'br', 'button',
    'canvas', 'caption', 'cite', 'code', 'col', 'colgroup',
    'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt',
    'em', 'embed',
    'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'i', 'iframe', 'img', 'input', 'ins',
    'kbd',
    'label', 'legend', 'li', 'link',
    'main', 'map', 'mark', 'menu', 'meter',
    'nav',
    'object', 'ol', 'optgroup', 'option', 'output',
    'p', 'picture', 'pre', 'progress',
    'q',
    's', 'samp', 'search', 'section', 'select', 'slot', 'small', 'source', 'span',
    'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track',
    'u', 'ul',
    'var', 'video',
    'wbr',
];

export const registerHtmlMirrors = (): void => {
    for (const tag of htmlTags) {
        customElements.define(`rx-${tag}`, class extends RxElementBase {});
    }
};
