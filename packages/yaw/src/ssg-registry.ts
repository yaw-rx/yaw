import { getComponentOptions, isSSG } from './component.js';
import type { ComponentOptions } from './component.js';
import type { BootstrapGlobals } from './component.js';

export interface SSGNode extends ComponentOptions {
    readonly children: SSGNode[];
}

export interface SSGRoot {
    readonly globals: BootstrapGlobals;
    readonly root: SSGNode;
}

let ssgRoot: SSGRoot | undefined;
let current: SSGNode | undefined;
const parentStack: SSGNode[] = [];

export const getSSGRoot = (): SSGRoot | undefined => ssgRoot;

export const ssgInitRoot = (globals: BootstrapGlobals, rootNode: SSGNode): void => {
    ssgRoot = { globals, root: rootNode };
    parentStack.length = 0;
    parentStack.push(rootNode);
    current = rootNode;
};

export const ssgEnter = (ctor: Function): void => {
    if (!isSSG()) return;
    const options = getComponentOptions(ctor);
    if (options === undefined) return;
    const node: SSGNode = { ...options, children: [] };
    if (current !== undefined) { (current.children as SSGNode[]).push(node); }
    parentStack.push(node);
    current = node;
};

export const ssgLeave = (): void => {
    if (!isSSG()) return;
    parentStack.pop();
    current = parentStack.length > 0 ? parentStack[parentStack.length - 1] : undefined;
};
