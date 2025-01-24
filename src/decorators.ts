import container from './container';

// @ts-ignore
Symbol.metadata ??= Symbol("Symbol.metadata");

export function Controller(prefix: string = '', tag: string | string[] = []) {
    const tags = typeof tag === 'string' ? [tag] : tag;
    return function (constructor: Function, context: ClassDecoratorContext) {
        context.metadata[Symbol.for('prefix')] = prefix;
        context.metadata[Symbol.for('tags')] = [...tags, Symbol.for('controller')];
        container.register({
            provide: context.name,
            useClass: constructor
        });
    };
}

export function Injectable(tag: string | string[] = []) {
    const tags = typeof tag === 'string' ? [tag] : tag;
    return function (constructor: Function, context: ClassDecoratorContext) {
        container.register({
            provide: context.name,
            useClass: constructor
        });
    };
}

export function Inject<TValue>(token: any): any {
    return function (value: any, context: ClassFieldDecoratorContext<unknown, TValue>) {
        if (context.kind !== 'field') {
            throw new Error('The Inject() decorator must be used as a class field decorator');
        }

        const dependenciesSymbol = Symbol.for('dependencies');
        const injectionToken: string = token.name ?? token;


        if (!context.metadata[dependenciesSymbol]) {
            context.metadata[dependenciesSymbol] = new Map<string, string>();
        }

        // @ts-ignore
        context.metadata[dependenciesSymbol][injectionToken] = context.name;

        const retVal = container.get<TValue>(injectionToken);

        return () => retVal;
    };
}

export function _httpMethodDecoratorFactory(path: string, method: string) {
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
