import { container } from './container';
import { WapidiError, DecoratorError } from './errors';
import { InjectionToken } from './InjectionToken';
import { getRoute, getRoutes, httpMethodDecoratorFactory } from './helpers';
import type { BaseRoute, InjectionTokenType, Instantiable } from './types';

// @ts-ignore
Symbol.metadata ??= Symbol('Symbol.metadata');

const UNINITIALIZED = Symbol('UNINITIALIZED');

export function Controller(prefix: string = '') {
    return function (constructor: Instantiable, context: ClassDecoratorContext) {
        try {
            if (context.kind !== 'class') {
                throw new DecoratorError('The @Controller decorator factory can only be used on the class');
            }
            context.metadata[Symbol.for('prefix')] = prefix;
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

export function Middlewares(middlewareFunctions: Function[]) {
    return function (originalMethodOrConstructor: any, context: ClassDecoratorContext | ClassMethodDecoratorContext) {
        try {
            if (context.kind === 'class') {
                const routes = getRoutes(context);
                for (const route of routes) {
                    if (!route.middlewares) route.middlewares = [];
                    for (let index = middlewareFunctions.length - 1; index >= 0; index--) {
                        route.middlewares.unshift(middlewareFunctions[index](route));
                    }
                }
            } else if (context.kind === 'method') {
                const route = getRoute(context);
                if (!route.middlewares) route.middlewares = [];
                for (const middleware of middlewareFunctions) {
                    route.middlewares.push(middleware(route));
                }
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

export function createRouteDecorator<ExtensionType>(cb: (route: BaseRoute & ExtensionType) => any) {
    return function (originalMethod: any, context: ClassMethodDecoratorContext) {
        try {
            if (context.kind !== 'method') {
                throw new DecoratorError('A route decorator | decorator factory can only be used on a class method');
            }
            cb(getRoute<BaseRoute & ExtensionType>(context));
            return originalMethod;
        } catch (error) {
            throw new WapidiError(error);
        }
    };
}
