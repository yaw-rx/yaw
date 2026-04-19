export class ExpressionEvalError extends Error {
    constructor(directive: string, host: string, expr: string, cause: unknown) {
        super(`[${directive}] on <${host}>: failed to evaluate "${expr}"`);
        this.cause = cause;
    }
}

export class ObservableNotFoundError extends Error {
    constructor(directive: string, host: string, identifier: string) {
        super(`[${directive}] on <${host}>: no observable found for "${identifier}"`);
    }
}

export class MissingParentError extends Error {
    constructor(directive: string, host: string) {
        super(`[${directive}] on <${host}>: host has no parentRef, cannot resolve context`);
    }
}

export class ExpressionParseError extends Error {
    constructor(directive: string, host: string, raw: string, reason: string) {
        super(`[${directive}] on <${host}>: cannot parse "${raw}" — ${reason}`);
    }
}

export class DirectiveInstantiationError extends Error {
    constructor(directive: string, host: string, cause: unknown) {
        super(`[${directive}] on <${host}>: failed to instantiate directive`);
        this.cause = cause;
    }
}

export class InvalidSelectorError extends Error {
    constructor(directive: string, selector: string) {
        super(`[${directive}]: selector "${selector}" is not in expected [attr] format`);
    }
}

export class BootstrapError extends Error {
    constructor(message: string) {
        super(`bootstrap: ${message}`);
    }
}
