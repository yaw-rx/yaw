import { htmlTags, mirrorStyles } from 'yaw-common';
import { RxElementBase } from '../rx-element.js';
import { Component } from '../component.js';

export { htmlTags };

export const mirrorCtors = new Set<Function>();

export const registerHtmlMirrors = (): void => {
    for (const tag of htmlTags) {
        const selector = `rx-${tag}`;
        const style = mirrorStyles.get(tag);
        const ctor = class extends RxElementBase {};
        mirrorCtors.add(ctor);
        const options = style !== undefined
            ? { selector, styles: `${selector}{${style}}` }
            : { selector };
        Component(options)(ctor);
    }
};
