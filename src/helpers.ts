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
import { routesSymbol, prefixSymbol, moduleSymbol, optionsSymbol } from './symbols';
import type {
    BaseRoute,
    Config,
    ExtendedControllerDecoratorMetadata,
    ExtendedModuleDecoratorMetadata,
    HTTPVerb,
    Instantiable,
    PreparedRoute,
    Routes,
} from './types';
import { join } from 'node:path/posix';

export const isClassLike = (obj: unknown): obj is Function =>
    Object.prototype.toString.call(obj) === '[object Function]';
export const isFunction = isClassLike;
export const isString = (obj: unknown): obj is string => Object.prototype.toString.call(obj) === '[object String]';

export const getTokenFor = (postfix: string) => {
    return Symbol.for(`wapidi:${postfix}`);
};

export const generateInjectionToken = (config: Config): [symbol, string] => {
    let token: symbol;
    let friendlyToken: string;

    if (isClassProviderShorthandConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = getTokenFor(provider.name);
            friendlyToken = provider.name;
        } else {
            throw new ConfigurationError('config.provide should be class|Function type');
        }
    } else if (isClassProviderConfig(config)) {
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = getTokenFor(provider.name);
            friendlyToken = provider.name;
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = getTokenFor(provider);
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
            token = getTokenFor(provider);
            friendlyToken = provider;
        } else {
            throw new ConfigurationError('config.provide should be an InjectionToken or string');
        }
    } else if (isSingletonProviderConfig(config)) {
        // right now, same as ClassProviderConfig, but might diverge in the future
        const provider = config.provide;
        if (isClassLike(provider)) {
            token = getTokenFor(provider.name);
            friendlyToken = provider.name;
        } else if (provider instanceof InjectionToken) {
            token = provider.token;
            friendlyToken = provider.description;
        } else if (isString(provider)) {
            token = getTokenFor(provider);
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
            token = getTokenFor(provider);
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
        const methodName = context.name.toString();
        const route = { method, path, actionName: methodName } as BaseRoute;

        if (!context.metadata[routesSymbol]) {
            context.metadata[routesSymbol] = {} as Routes;
        }

        const routeMeta = (context.metadata as ExtendedControllerDecoratorMetadata)[routesSymbol][methodName];

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
    const methodName = context.name.toString();

    if (!context.metadata[routesSymbol]) {
        context.metadata[routesSymbol] = {} as Routes<TRoute>;
    }

    if (!context.metadata[routesSymbol][methodName]) {
        context.metadata[routesSymbol][methodName] = {} as TRoute;
    }

    return (context.metadata as ExtendedControllerDecoratorMetadata<TRoute>)[routesSymbol][methodName];
}

export function getRoutesFromContext(context: ClassDecoratorContext): BaseRoute[] {
    if (!context.metadata[routesSymbol]) {
        context.metadata[routesSymbol] = {} as Routes;
    }

    return Object.values((context.metadata as ExtendedControllerDecoratorMetadata)[routesSymbol]);
}

const getRoutesForAController = <TRoute extends BaseRoute = BaseRoute>(
    Controller: Instantiable,
    __modulePrefix: string = ''
): PreparedRoute<TRoute>[] => {
    const metadata = Controller[Symbol.metadata] as ExtendedControllerDecoratorMetadata<TRoute>;
    const result = [] as PreparedRoute<TRoute>[];
    const controllerPrefix = metadata[prefixSymbol] ?? '';
    const routes = metadata[routesSymbol];
    const ctrl = container.get<typeof Controller>(Controller);
    for (const route of Object.values(routes)) {
        result.push({
            ...route,
            preparedPath: join('/', __modulePrefix, controllerPrefix, route.path),
            action: ctrl[route.actionName].bind(ctrl) as Function,
        });
    }
    return result;
};

export const getRoutes = <TRoute extends BaseRoute = BaseRoute>(Class: Instantiable): PreparedRoute<TRoute>[] => {
    const metadata = Class[Symbol.metadata] as ExtendedModuleDecoratorMetadata;
    const isModule = metadata[moduleSymbol];
    const results = [] as PreparedRoute<TRoute>[];

    if (isModule) {
        const moduleOptions = metadata[optionsSymbol];
        const modulePrefix = metadata[prefixSymbol];
        const controllers = moduleOptions.controllers ?? [];
        for (const ctrl of controllers) {
            results.push(...getRoutesForAController<TRoute>(ctrl, modulePrefix));
        }
    } else {
        results.push(...getRoutesForAController<TRoute>(Class));
    }

    return results;
};
