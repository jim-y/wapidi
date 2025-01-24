import container from './container';

// @ts-ignore
Symbol.metadata ??= Symbol('Symbol.metadata');

export function Controller(prefix: string = '', tag: string | string[] = []) {
	const tags = typeof tag === 'string' ? [tag] : tag;
	return function (constructor: Function, context: ClassDecoratorContext) {
		context.metadata[Symbol.for('prefix')] = prefix;
		context.metadata[Symbol.for('tags')] = [...tags, Symbol.for('controller')];
		container.register({
			provide: context.name,
			useClass: constructor,
		});
	};
}

export function Injectable(tag: string | string[] = []) {
	const tags = typeof tag === 'string' ? [tag] : tag;
	return function (constructor: Function, context: ClassDecoratorContext) {
		container.register({
			provide: context.name,
			useClass: constructor,
		});
	};
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
