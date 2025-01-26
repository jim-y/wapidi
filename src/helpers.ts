import { container } from './container';
import { ConfigurationError } from './errors';
import { InjectionToken } from './InjectionToken';
import {
    isClassProviderConfig,
    isClassProviderShorthandConfig,
    isFactoryProviderConfig,
    isSingletonProviderConfig,
    isValueProviderConfig,
} from './types';
import type { BaseRoute, Config, HTTPVerb, Instantiable, PreparedRoute, Routes } from './types';
import { join } from 'node:path/posix';

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

export function httpMethodDecoratorFactory(path: BaseRoute['path'], method: HTTPVerb) {
    return function (originalMethod: any, context: ClassMethodDecoratorContext) {
        const methodName = context.name;
        const route = { method, path, actionName: methodName } as BaseRoute;
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

export function getRouteFromContext<TRoute extends BaseRoute = BaseRoute>(
    context: ClassMethodDecoratorContext
): TRoute {
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

export function getRoutesFromContext(context: ClassDecoratorContext): BaseRoute[] {
    const routesSymbol = Symbol.for('routes');

    if (!context.metadata[routesSymbol]) {
        context.metadata[routesSymbol] = {};
    }

    return Object.values(context.metadata[routesSymbol]);
}

export const getRoutesMeta = <TRoute extends BaseRoute = BaseRoute>(Module: Instantiable): PreparedRoute<TRoute>[] => {
    const metadata = Module[Symbol.metadata];
    const controllerPrefix = (metadata[Symbol.for('prefix')] as string) ?? '';
    const routes = metadata[Symbol.for('routes')] as Routes<TRoute>;
    const result = [] as PreparedRoute<TRoute>[];
    const ctrl = container.get<typeof Module>(Module);
    for (const route of Object.values(routes)) {
        result.push({
            ...route,
            preparedPath: join('/', controllerPrefix, route.path),
            action: ctrl[route.actionName].bind(ctrl),
        });
    }
    return result;
};
