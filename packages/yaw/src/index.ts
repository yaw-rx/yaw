export { RxElement } from './rx-element.js';
export { Component, bootstrap, getRawTemplate } from './component.js';
export { Router, ROUTES } from './router.js';
export { Directive } from './directive.js';
export { state } from './observable.js';
export { Injectable } from './di/injectable.js';
export { Inject } from './di/inject.js';
export { Injector } from './di/injector.js';
export * from './errors.js';
export type { AttributeCodec } from './attribute-codec/types.js';
export { registerAttributeCodecs } from './attribute-codec/registry.js';
export { decodeAttribute } from './attribute-codec/decode.js';
export { encodeAttribute } from './attribute-codec/encode.js';
export type { Route } from './component.js';
export type { Directive as DirectiveInterface, DirectiveCtor, ParsedExpr, RxElementLike } from './directive.js';

import { RxIf } from './directives/rx-if.js';
import { RxFor } from './directives/rx-for.js';
import type { DirectiveCtor } from './directive.js';
export { RxIf, RxFor };
export const DefaultGlobalDirectives: readonly DirectiveCtor[] = [RxIf, RxFor];

export { RxRouterOutlet } from './components/rx-router-outlet.js';
export { RxText } from './components/rx-text.js';
