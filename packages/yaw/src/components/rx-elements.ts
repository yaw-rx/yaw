import { htmlTags, mirrorDisplay } from 'yaw-common';
import { RxElementBase } from '../rx-element.js';
import { Component } from '../component.js';

export { htmlTags };

export const mirrorCtors = new Set<Function>();

export const registerHtmlMirrors = (): void => {
    for (const tag of htmlTags) {
        const selector = `rx-${tag}`;
        const display = mirrorDisplay.get(tag);
        const ctor = class extends RxElementBase {};
        mirrorCtors.add(ctor);
        const options = display !== undefined
            ? { selector, styles: `${selector}{display:${display}}` }
            : { selector };
        Component(options)(ctor);
    }
};
