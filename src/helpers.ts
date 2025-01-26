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
import type { BaseRoute, Config, HTTPVerb, Instantiable, ModuleOptions, PreparedRoute, Routes } from './types';
import { join } from 'node:path/posix';

export const isClassLike = (obj: unknown): obj is Function =>
    Object.prototype.toString.call(obj) === '[object Function]';
export const isFunction = isClassLike;
export const isString = (obj: unknown): obj is string => Object.prototype.toString.call(obj) === '[object String]';

export const generateInjectionToken = (config: Config): [Symbol, string] => {
    let token: Symbol;
    let friendlyToken: string;

    if (isClassProviderShorthandConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for(provider.name);
            friendlyToken = provider.name;
        } else {
            throw new ConfigurationError('config.provide should be class|Function type');
        }
    } else if (isClassProviderConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for((config.provide as Instantiable).name);
            friendlyToken = (config.provide as Instantiable).name;
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
            friendlyToken = provider;
        } else {
            throw new ConfigurationError('config.provide should be class|Function, InjectionToken or string');
        }
    } else if (isFactoryProviderConfig(config)) {
        const provider = config.provide;
        if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
            friendlyToken = provider;
        } else {
            throw new ConfigurationError('config.provide should be an InjectionToken or string');
        }
    } else if (isSingletonProviderConfig(config)) {
        // right now, same as ClassProviderConfig, but might diverge in the future
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = Symbol.for((config.provide as Instantiable).name);
            friendlyToken = (config.provide as Instantiable).name;
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
            friendlyToken = provider;
        } else {
            throw new ConfigurationError('config.provide should be class|Function, InjectionToken or string');
        }
    } else if (isValueProviderConfig(config)) {
        const provider = config.provide;
        if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = Symbol.for(provider);
            friendlyToken = provider;
        } else {
            throw new ConfigurationError('config.provide should be an InjectionToken or string');
        }
    } else {
        throw new ConfigurationError('Unknown configuration type');
    }

    return [token, friendlyToken];
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

const getRoutesForAController = <TRoute extends BaseRoute = BaseRoute>(
    Controller: Instantiable,
    __modulePrefix: string = ''
): PreparedRoute<TRoute>[] => {
    const metadata = Controller[Symbol.metadata];
    const result = [] as PreparedRoute<TRoute>[];
    const controllerPrefix = (metadata[Symbol.for('prefix')] as string) ?? '';
    const routes = metadata[Symbol.for('routes')] as Routes<TRoute>;
    const ctrl = container.get<typeof Controller>(Controller);
    for (const route of Object.values(routes)) {
        result.push({
            ...route,
            preparedPath: join('/', __modulePrefix, controllerPrefix, route.path),
            action: ctrl[route.actionName].bind(ctrl),
        });
    }
    return result;
};

export const getRoutes = <TRoute extends BaseRoute = BaseRoute>(Class: Instantiable): PreparedRoute<TRoute>[] => {
    const metadata = Class[Symbol.metadata];
    const isModule = metadata[Symbol.for('module')];
    const results = [] as PreparedRoute<TRoute>[];

    if (isModule) {
        const moduleOptions = metadata[Symbol.for('options')] as ModuleOptions;
        const modulePrefix = metadata[Symbol.for('prefix')] as string;
        const controllers = moduleOptions.controllers ?? [];
        for (const ctrl of controllers) {
            results.push(...getRoutesForAController<TRoute>(ctrl, modulePrefix));
        }
    } else {
        results.push(...getRoutesForAController<TRoute>(Class));
    }

    return results;
};
