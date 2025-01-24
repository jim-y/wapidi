import container from './container';
import type { BaseRoute } from '.';

// @ts-ignore
Symbol.metadata ??= Symbol('Symbol.metadata');

export function Controller(prefix: string = '') {
    return function (constructor: Function, context: ClassDecoratorContext) {
        context.metadata[Symbol.for('prefix')] = prefix;
        container.register({
            provide: context.name,
            useSingleton: constructor,
        });
    };
}

export function Injectable(constructor: Function, context: ClassDecoratorContext) {
    container.register({
        provide: context.name,
        useClass: constructor,
    });
}

const UNINITIALIZED = Symbol('UNINITIALIZED');
export function Inject<TValue>(token: any): any {
    return function (value: any, context: ClassAccessorDecoratorContext<unknown, TValue>) {
        if (context.kind !== 'accessor') {
            throw new Error('The Inject() decorator must be used as a class field decorator');
        }
        return {
            init() {
                return UNINITIALIZED;
            },
            get() {
                return container.get<TValue>(token);
            },
            set() {
                throw new Error('must not set!');
            },
        };
    };
}

function _httpMethodDecoratorFactory(path: string, method: string) {
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

export function createRouteDecorator<ExtensionType = {}>(cb: (route: BaseRoute & ExtensionType) => void) {
    return function (originalMethod: any, context: ClassMethodDecoratorContext) {
        if (context.kind !== 'method') {
            throw new Error('Unaplicable');
        }
        const methodName = context.name;
        const routesSymbol = Symbol.for('routes');

        if (!context.metadata[routesSymbol]) {
            context.metadata[routesSymbol] = {};
        }

        if (!context.metadata[routesSymbol][methodName]) {
            context.metadata[routesSymbol][methodName] = {} as BaseRoute;
        }

        const route: BaseRoute & ExtensionType = context.metadata[routesSymbol][methodName];

        cb(route);

        return originalMethod;
    };
}

export function Get(path: string = '') {
    return _httpMethodDecoratorFactory(path, 'get');
}
export function Post(path: string = '') {
    return _httpMethodDecoratorFactory(path, 'post');
}
export function Delete(path: string = '') {
    return _httpMethodDecoratorFactory(path, 'delete');
}
export function Put(path: string = '') {
    return _httpMethodDecoratorFactory(path, 'put');
}

export function Middlewares(middlewareFunctions: Function[]) {
    return function (originalMethodOrConstructor: any, context: ClassDecoratorContext | ClassMethodDecoratorContext) {
        const routesSymbol = Symbol.for('routes');

        if (!context.metadata[routesSymbol]) {
            context.metadata[routesSymbol] = {};
        }

        if (context.kind === 'class') {
            const routes = Object.values(context.metadata[routesSymbol]);
            for (const route of routes) {
                if (!route.middlewares) route.middlewares = [];
                const classMiddlewares = [];
                for (const middleware of middlewareFunctions) {
                    route.middlewares.unshift(middleware(route));
                }
            }
        } else if (context.kind === 'method') {
            if (!context.metadata[routesSymbol][context.name]) {
                context.metadata[routesSymbol][context.name] = { action: context.name };
            }
            const route = context.metadata[routesSymbol][context.name];
            if (!route.middlewares) route.middlewares = [];
            for (const middleware of middlewareFunctions) {
                route.middlewares = [...route.middlewares, middleware(route)];
            }
            return originalMethodOrConstructor;
        } else {
            throw new Error('Only on class or methods');
        }
    };
}
