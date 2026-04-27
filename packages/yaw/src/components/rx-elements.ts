import { htmlTags, mirrorStyles, transformStyles } from 'yaw-common';
import { RxElementBase } from '../rx-element.js';

export { htmlTags };

export const registerHtmlMirrors = (deferred?: Map<string, CustomElementConstructor>): void => {
    for (const tag of htmlTags) {
        const selector = `rx-${tag}`;
        const ctor = class extends RxElementBase {};
        const style = mirrorStyles.get(tag);
        if (style !== undefined) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(transformStyles(`:host{${style}}`, selector));
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
        if (deferred !== undefined) {
            deferred.set(selector, ctor);
        } else {
            customElements.define(selector, ctor);
        }
    }
};
