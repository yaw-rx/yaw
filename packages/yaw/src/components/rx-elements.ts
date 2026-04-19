import { htmlTags } from 'yaw-common';
import { RxElementBase } from '../rx-element.js';

export { htmlTags };

export const registerHtmlMirrors = (): void => {
    for (const tag of htmlTags) {
        customElements.define(`rx-${tag}`, class extends RxElementBase {});
    }
};
