/**
 * Thrown when a binding path cannot be parsed.
 */
export class BindingParseError extends Error {
    /**
     * @param {string} raw - The raw binding path string.
     * @param {string} reason - Why parsing failed.
     */
    constructor(raw: string, reason: string) {
        super(`binding parse: "${raw}" - ${reason}`);
    }
}

/**
 * Thrown when a caret-prefixed binding path walks past the top of the hostNode chain.
 */
export class BindingScopeError extends Error {
    /**
     * @param {string} host - Tag name of the element with the binding.
     * @param {string} raw - The raw binding path string.
     * @param {number} carets - Number of scope levels the path attempted to walk.
     */
    constructor(host: string, raw: string, carets: number) {
        super(`binding on <${host}>: "${raw}" walked ${carets} scope(s) up but hostNode chain ended`);
    }
}

/**
 * Thrown when a segment in a binding path does not exist on the resolved target.
 */
export class BindingPathError extends Error {
    /**
     * @param {string} host - Tag name of the element with the binding.
     * @param {string} raw - The raw binding path string.
     * @param {string} segment - The path segment that could not be found.
     */
    constructor(host: string, raw: string, segment: string) {
        super(`binding on <${host}>: "${raw}" - segment "${segment}" not found`);
    }
}

/**
 * Thrown when a binding path resolves to a value that is not subscribable.
 */
export class BindingNotSubscribableError extends Error {
    /**
     * @param {string} host - Tag name of the element with the binding.
     * @param {string} raw - The raw binding path string.
     * @param {string} detail - Description of why the value is not subscribable.
     */
    constructor(host: string, raw: string, detail: string) {
        super(`binding on <${host}>: "${raw}" - ${detail}`);
    }
}

/**
 * Thrown when a directive's element has no hostNode set.
 */
export class MissingHostError extends Error {
    /**
     * @param {string} directive - Name of the directive.
     * @param {string} host - Tag name of the element the directive is on.
     */
    constructor(directive: string, host: string) {
        super(`[${directive}] on <${host}>: host has no hostNode, cannot resolve context`);
    }
}

/**
 * Thrown when a directive constructor throws during instantiation.
 */
export class DirectiveInstantiationError extends Error {
    /**
     * @param {string} directive - Name of the directive.
     * @param {string} host - Tag name of the element the directive is on.
     * @param {unknown} cause - The original error.
     */
    constructor(directive: string, host: string, cause: unknown) {
        super(`[${directive}] on <${host}>: failed to instantiate directive`);
        this.cause = cause;
    }
}

/**
 * Thrown when a directive's selector is not in the expected [attr] format.
 */
export class InvalidSelectorError extends Error {
    /**
     * @param {string} directive - Name of the directive.
     * @param {string} selector - The invalid selector string.
     */
    constructor(directive: string, selector: string) {
        super(`[${directive}]: selector "${selector}" is not in expected [attr] format`);
    }
}

/**
 * Thrown when bootstrap fails due to misconfiguration.
 */
export class BootstrapError extends Error {
    /**
     * @param {string} message - Description of the failure.
     */
    constructor(message: string) {
        super(`bootstrap: ${message}`);
    }
}

/**
 * Thrown when hydration encounters an unexpected DOM state.
 */
export class HydrationError extends Error {
    /**
     * @param {string} message - Description of the failure.
     */
    constructor(message: string) {
        super(`hydration: ${message}`);
    }
}

/**
 * Thrown during SSG capture when serialization or rendering fails.
 */
export class SSGError extends Error {
    /**
     * @param {string} message - Description of the failure.
     */
    constructor(message: string) {
        super(`ssg: ${message}`);
    }
}

/**
 * Thrown when two hooks both claim the same target in a hook dispatch.
 * This indicates a directive misconfiguration - only one hook should
 * own a given claim target (element, segment, etc.) per dispatch.
 */
export class DuplicateHookClaimError extends Error {
    /**
     * @param {string} hookType - The hook type ('mutation' | 'scope' | 'binding').
     * @param {string} detail - Description of the duplicate claim.
     */
    constructor(hookType: string, detail: string) {
        super(`${hookType} hook: duplicate claim - ${detail}`);
    }
}

/**
 * Thrown when an attribute codec fails to encode or decode a value.
 */
export class AttributeMarshalError extends Error {
    /**
     * @param {string} key - The attribute/state key name.
     * @param {string} typeName - The codec type name (e.g. 'number', 'Date').
     * @param {'encode' | 'decode'} direction - Whether encoding or decoding failed.
     * @param {string} raw - String representation of the value that failed.
     * @param {unknown} cause - The original error.
     */
    constructor(key: string, typeName: string, direction: 'encode' | 'decode', raw: string, cause: unknown) {
        super(`attribute "${key}": failed to ${direction} as ${typeName} - value was "${raw}"`);
        this.cause = cause;
    }
}
