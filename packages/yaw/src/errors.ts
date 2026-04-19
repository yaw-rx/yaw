export class BindParseError extends Error {
    constructor(raw: string, reason: string) {
        super(`bind parse: "${raw}" — ${reason}`);
    }
}

export class BindScopeError extends Error {
    constructor(host: string, raw: string, carets: number) {
        super(`bind on <${host}>: "${raw}" walked ${carets} scope(s) up but parentRef chain ended`);
    }
}

export class BindPathError extends Error {
    constructor(host: string, raw: string, segment: string) {
        super(`bind on <${host}>: "${raw}" — segment "${segment}" not found`);
    }
}

export class BindNotSubscribableError extends Error {
    constructor(host: string, raw: string, detail: string) {
        super(`bind on <${host}>: "${raw}" — ${detail}`);
    }
}

export class MissingParentError extends Error {
    constructor(directive: string, host: string) {
        super(`[${directive}] on <${host}>: host has no parentRef, cannot resolve context`);
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
