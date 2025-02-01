import { container } from './container';
import { WapidiError, DecoratorError, MiddlewareError } from './errors';
import { InjectionToken } from './InjectionToken';
import { getRouteFromContext, getRoutesFromContext, httpMethodDecoratorFactory } from './helpers';
import { moduleSymbol, optionsSymbol, prefixSymbol } from './symbols';
import { isModuleOptions } from './types';
import type {
    BaseRoute,
    ExtendedControllerDecoratorMetadata,
    ExtendedModuleDecoratorMetadata,
    InjectionTokenType,
    Instantiable,
    MiddlewareType,
    ModuleOptions,
} from './types';
import { Middleware, MiddlewareFactory } from './Middleware';

// @ts-expect-error polyfill for Symbol.metadata
Symbol.metadata ??= Symbol('Symbol.metadata');

const UNINITIALIZED = Symbol('UNINITIALIZED');

export function Module(prefixOrOptions?: string | ModuleOptions, options?: ModuleOptions) {
    return function (constructor: Instantiable, context: ClassDecoratorContext) {
        try {
            if (context.kind !== 'class') {
                throw new DecoratorError('The @Module decorator factory can only be used on the class');
            }

            let prefix = '';
            let moduleOptions: ModuleOptions;

            if (prefixOrOptions != null) {
                if (isModuleOptions(prefixOrOptions)) {
                    moduleOptions = prefixOrOptions;
                } else {
                    prefix = prefixOrOptions;
                    moduleOptions = options;
                }
            }

            (context.metadata as ExtendedModuleDecoratorMetadata)[moduleSymbol] = true;
            (context.metadata as ExtendedModuleDecoratorMetadata)[prefixSymbol] = prefix;
            (context.metadata as ExtendedModuleDecoratorMetadata)[optionsSymbol] = moduleOptions;
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

export function Controller(prefix: string = '') {
    return function (constructor: Instantiable, context: ClassDecoratorContext): void {
        try {
            if (context.kind !== 'class') {
                throw new DecoratorError('The @Controller decorator factory can only be used on the class');
            }
            (context.metadata as ExtendedControllerDecoratorMetadata)[prefixSymbol] = prefix;
            container.register({
                provide: context.name,
                useSingleton: constructor,
            });
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

export function Injectable(as?: InjectionToken) {
    return function (constructor: Instantiable, context: ClassDecoratorContext) {
        try {
            if (context.kind !== 'class') {
                throw new DecoratorError('The @Injectable decorator factory can only be used on the class');
            }
            container.register({
                provide: as ?? constructor,
                useClass: constructor,
            });
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

export function Singleton(as?: InjectionToken) {
    return function (constructor: Instantiable, context: ClassDecoratorContext) {
        try {
            if (context.kind !== 'class') {
                throw new DecoratorError('The @Singleton decorator factory can only be used on the class');
            }
            container.register({
                provide: as ?? constructor,
                useSingleton: constructor,
            });
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

export function Inject<T>(token: Instantiable | InjectionTokenType): any {
    return function ({ get, set }, context: ClassAccessorDecoratorContext<unknown, T>) {
        try {
            if (context.kind !== 'accessor') {
                throw new DecoratorError(
                    'The Inject() decorator factory must be used as a class auto-accessor decorator'
                );
            }

            return {
                init(initialValue) {
                    if (initialValue != null) {
                        console.warn(
                            `Accessor ${this.constructor.name}.${String(
                                context.name
                            )} was initialized with a value, however, this value will be overriden by the injected value.`
                        );
                    }
                    return UNINITIALIZED;
                },
                get(): T {
                    const currentValue = get.call(this);
                    if (currentValue === UNINITIALIZED) {
                        const value = container.get<T>(token);
                        set.call(this, value);
                        return value;
                    }
                    return currentValue;
                },
                set(newValue: T) {
                    try {
                        const oldValue = get.call(this);
                        if (oldValue !== UNINITIALIZED) {
                            throw new DecoratorError(
                                `Accessor ${this.constructor.name}.${String(context.name)} can only be set once`
                            );
                        }
                        set.call(this, newValue);
                    } catch (error) {
                        throw new WapidiError(error);
                    }
                },
            };
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

export function Get(path: string = '') {
    return httpMethodDecoratorFactory(path, 'get');
}
export function Post(path: string = '') {
    return httpMethodDecoratorFactory(path, 'post');
}
export function Delete(path: string = '') {
    return httpMethodDecoratorFactory(path, 'delete');
}
export function Put(path: string = '') {
    return httpMethodDecoratorFactory(path, 'put');
}
export function Patch(path: string = '') {
    return httpMethodDecoratorFactory(path, 'patch');
}

export function Middlewares(middlewareFunctions: MiddlewareType | MiddlewareType[], ...rest: MiddlewareType[]) {
    return function (originalMethodOrConstructor: any, context: ClassDecoratorContext | ClassMethodDecoratorContext) {
        try {
            let middlewares: MiddlewareType[] = [];

            if (Array.isArray(middlewareFunctions)) {
                middlewares = middlewareFunctions;
            } else if (
                typeof middlewareFunctions === 'function' ||
                middlewareFunctions instanceof Middleware ||
                middlewareFunctions instanceof MiddlewareFactory
            ) {
                if (
                    rest.some(
                        middleware =>
                            typeof middleware !== 'function' &&
                            !(middleware instanceof Middleware) &&
                            !(middleware instanceof MiddlewareFactory)
                    )
                ) {
                    throw new MiddlewareError('Invalid middleware provided');
                }
                middlewares = [middlewareFunctions, ...rest];
            } else {
                throw new MiddlewareError('Invalid middleware provided.');
            }

            if (context.kind === 'class') {
                const routes = getRoutesFromContext(context);
                for (const route of routes) {
                    if (!route.middlewares) route.middlewares = [];
                    for (let index = middlewares.length - 1; index >= 0; index--) {
                        const middleware = middlewares[index];
                        if (middleware instanceof Middleware || middleware instanceof MiddlewareFactory) {
                            if (!middleware.ignoredRoutes.includes(route.actionName)) {
                                route.middlewares.unshift(middleware);
                            }
                        } else {
                            route.middlewares.unshift(middleware);
                        }
                    }
                }
            } else if (context.kind === 'method') {
                const route = getRouteFromContext(context);
                if (!route.middlewares) route.middlewares = [];
                route.middlewares.push(...middlewares);
                return originalMethodOrConstructor;
            } else {
                throw new DecoratorError(
                    'The @Middlewares() decorator factory can be only applied on the class or on class methods'
                );
            }
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}

// =========================
//          Util
// =========================

export function createRouteDecorator<TRoute extends BaseRoute = BaseRoute>(cb: (route: TRoute) => any) {
    return function (originalMethod: any, context: ClassMethodDecoratorContext) {
        try {
            if (context.kind !== 'method') {
                throw new DecoratorError('A route decorator | decorator factory can only be used on a class method');
            }
            cb(getRouteFromContext<TRoute>(context));
            return originalMethod;
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}
