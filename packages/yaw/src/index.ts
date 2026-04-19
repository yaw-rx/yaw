export { RxElement } from './rx-element.js';
export { Component, bootstrap, getRawTemplate } from './component.js';
export { Router, ROUTES } from './router.js';
export { Directive } from './directive.js';
export { observable } from './observable.js';
export { Injectable } from './di/injectable.js';
export { Inject } from './di/inject.js';
export { Injector } from './di/injector.js';
export * from './errors.js';
export type { Route } from './component.js';
export type { Directive as DirectiveInterface, DirectiveCtor, ParsedExpr, RxElementLike } from './directive.js';

import { RxIf } from './directives/rx-if.js';
import { RxFor } from './directives/rx-for.js';
import type { DirectiveCtor } from './directive.js';
export { RxIf, RxFor };
export const DefaultGlobalDirectives: readonly DirectiveCtor[] = [RxIf, RxFor];

export { RxRouterOutlet } from './components/rx-router-outlet.js';
export { RxText } from './components/rx-text.js';
