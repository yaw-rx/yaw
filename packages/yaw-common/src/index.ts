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

const blockOnly = [
    'address', 'article', 'aside', 'details', 'dialog', 'div',
    'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
    'header', 'hgroup', 'legend',
    'main', 'menu', 'nav', 'search', 'section', 'summary',
] as const;

const inlineBlock = [
    'button', 'img', 'input', 'label', 'meter', 'progress', 'select', 'textarea',
    'audio', 'video', 'canvas', 'iframe',
] as const;

export const mirrorStyles: ReadonlyMap<string, string> = new Map<string, string>([
    ...blockOnly.map((t) => [t, 'display:block'] as [string, string]),
    ...inlineBlock.map((t) => [t, 'display:inline-block'] as [string, string]),
    ['slot', 'display:contents'],
    ['table', 'display:table'],
    ['caption', 'display:table-caption'],
    ['col', 'display:table-column'],
    ['colgroup', 'display:table-column-group'],
    ['tbody', 'display:table-row-group'],
    ['td', 'display:table-cell'],
    ['tfoot', 'display:table-footer-group'],
    ['th', 'display:table-cell;font-weight:bold;text-align:center'],
    ['thead', 'display:table-header-group'],
    ['tr', 'display:table-row'],
    ['h1', 'display:block;font-size:2em;font-weight:bold;margin:0.67em 0'],
    ['h2', 'display:block;font-size:1.5em;font-weight:bold;margin:0.83em 0'],
    ['h3', 'display:block;font-size:1.17em;font-weight:bold;margin:1em 0'],
    ['h4', 'display:block;font-weight:bold;margin:1.33em 0'],
    ['h5', 'display:block;font-size:0.83em;font-weight:bold;margin:1.67em 0'],
    ['h6', 'display:block;font-size:0.67em;font-weight:bold;margin:2.33em 0'],
    ['p', 'display:block;margin:1em 0'],
    ['blockquote', 'display:block;margin:1em 40px'],
    ['pre', 'display:block;font-family:monospace;white-space:pre;margin:1em 0'],
    ['hr', 'display:block;border-style:inset;border-width:1px;margin:0.5em auto'],
    ['ul', 'display:block;list-style-type:disc;padding-inline-start:40px;margin:1em 0'],
    ['ol', 'display:block;list-style-type:decimal;padding-inline-start:40px;margin:1em 0'],
    ['li', 'display:list-item'],
    ['dl', 'display:block;margin:1em 0'],
    ['dd', 'display:block;margin-inline-start:40px'],
    ['code', 'font-family:monospace'],
    ['kbd', 'font-family:monospace'],
    ['samp', 'font-family:monospace'],
    ['strong', 'font-weight:bold'],
    ['b', 'font-weight:bold'],
    ['em', 'font-style:italic'],
    ['i', 'font-style:italic'],
    ['cite', 'font-style:italic'],
    ['dfn', 'font-style:italic'],
    ['var', 'font-style:italic'],
    ['u', 'text-decoration:underline'],
    ['ins', 'text-decoration:underline'],
    ['s', 'text-decoration:line-through'],
    ['del', 'text-decoration:line-through'],
    ['mark', 'background-color:yellow;color:black'],
    ['small', 'font-size:smaller'],
    ['sub', 'vertical-align:sub;font-size:smaller'],
    ['sup', 'vertical-align:super;font-size:smaller'],
    ['a', 'color:#06c;text-decoration:underline;cursor:pointer'],
]);

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
