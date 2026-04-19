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
] as const;

const htmlTagSet = new Set(htmlTags);

const rewriteTags = (template: string): string =>
    template.replace(/<(\/?)([\w-]+)/g, (match, slash, tag) =>
        htmlTagSet.has(tag as (typeof htmlTags)[number]) ? `<${slash}rx-${tag}` : match
    );

export const transformTemplate = (template: string): string =>
    rewriteTags(template)
        .replace(/\{\{(.+?)\}\}/g, '<rx-text bind="$1"></rx-text>')
        .replace(/\[class\.([^\]]+)\]="([^"]+)"/g, 'data-rx-class-$1="$2"')
        .replace(/\[([^\]]+)\]="([^"]+)"/g, 'data-rx-bind-$1="$2"')
        .replace(/on(\w+)="(\w+)"/g, 'data-rx-on-$1="$2"')
        .replace(/#(\w+)/g, 'data-rx-ref="$1"');
