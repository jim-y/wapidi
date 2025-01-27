export class WapidiError extends Error {
    name = 'WapidiError';
    origin = 'wapidi:core';
    constructor(cause) {
        super('An error was raised in `wapidi`', { cause });
    }
}

export class ContainerError extends Error {
    name = 'ContainerError';
    origin = 'wapidi:dependency-injection:container';
}

export class ConfigurationError extends ContainerError {
    name = 'ConfigurationError';
    origin = 'wapidi:dependency-injection:container:configuration';
}

export class DecoratorError extends Error {
    name = 'DecoratorError';
    origin = 'wapidi:decorators';
}

export class MiddlewareError extends Error {
    name = 'MiddlewareError';
    origin = 'wapidi:middleware';
}
