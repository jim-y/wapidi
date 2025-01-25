import { ConfigurationError } from './errors';
import InjectionToken from './InjectionToken';
import {
    isClassProviderConfig,
    isClassProviderShorthandConfig,
    isFactoryProviderConfig,
    isSingletonProviderConfig,
    isValueProviderConfig,
} from './types';
import type { BaseRoute, Config, Instantiable } from './types';

export const isClassLike = (obj: unknown): obj is Function =>
    Object.prototype.toString.call(obj) === '[object Function]';
export const isFunction = isClassLike;
export const isString = (obj: unknown): obj is string => Object.prototype.toString.call(obj) === '[object String]';

export const generateInjectionToken = (config: Config): Symbol => {
    let token: Symbol;

    if (isClassProviderShorthandConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for(provider.name);
        } else {
            throw new ConfigurationError('config.provide should be class|Function type');
        }
    } else if (isClassProviderConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for((config.provide as Instantiable).name);
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
        } else {
            throw new ConfigurationError('config.provide should be class|Function, InjectionToken or string');
        }
    } else if (isFactoryProviderConfig(config)) {
        const provider = config.provide;
        if (provider instanceof InjectionToken) {
            token = provider.token;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
        } else {
            throw new ConfigurationError('config.provide should be an InjectionToken or string');
        }
    } else if (isSingletonProviderConfig(config)) {
        // right now, same as ClassProviderConfig, but might diverge in the future
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for((config.provide as Instantiable).name);
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
        } else {
            throw new ConfigurationError('config.provide should be class|Function, InjectionToken or string');
        }
    } else if (isValueProviderConfig(config)) {
        const provider = config.provide;
        if (provider instanceof InjectionToken) {
            token = provider.token;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
        } else {
            throw new ConfigurationError('config.provide should be an InjectionToken or string');
        }
    } else {
        throw new ConfigurationError('Unknown configuration type');
    }

    return token;
};

export function httpMethodDecoratorFactory(path: string, method: string) {
    return function (originalMethod: any, context: ClassMethodDecoratorContext) {
        const methodName = context.name;
        const route = { method, path, action: methodName };

        const routesSymbol = Symbol.for('routes');

        if (!context.metadata[routesSymbol]) {
            context.metadata[routesSymbol] = {};
        }

        const routeMeta = context.metadata[routesSymbol][methodName];

        if (!routeMeta) {
            context.metadata[routesSymbol][methodName] = route;
        } else {
            context.metadata[routesSymbol][methodName] = {
                ...routeMeta,
                ...route,
            };
        }
        return originalMethod;
    };
}

export function getRoute<TRoute = BaseRoute>(context: ClassMethodDecoratorContext) {
    const methodName = context.name;
    const routesSymbol = Symbol.for('routes');

    if (!context.metadata[routesSymbol]) {
        context.metadata[routesSymbol] = {};
    }

    if (!context.metadata[routesSymbol][methodName]) {
        context.metadata[routesSymbol][methodName] = {} as TRoute;
    }

    return context.metadata[routesSymbol][methodName];
}

export function getRoutes(context: ClassDecoratorContext): BaseRoute[] {
    const routesSymbol = Symbol.for('routes');

    if (!context.metadata[routesSymbol]) {
        context.metadata[routesSymbol] = {};
    }

    return Object.values(context.metadata[routesSymbol]);
}