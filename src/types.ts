import { moduleSymbol, optionsSymbol, prefixSymbol, routesSymbol } from './helpers';
import { InjectionToken } from './InjectionToken';
import { Middleware, MiddlewareFactory } from './Middleware';

// ===========================
// =====    Decorator    =====
// ===========================

export type HTTPVerb = 'get' | 'post' | 'patch' | 'put' | 'delete';

export type BaseRoute = {
    method: HTTPVerb;
    path: string;
    actionName: string;
    middlewares: MiddlewareType[];
};

export type PreparedRoute<TRoute extends BaseRoute = BaseRoute> = TRoute & {
    preparedPath: string;
    action: Function;
};

export type Routes<TRoute = BaseRoute> = Record<string, TRoute>;

export type ExtendedControllerDecoratorMetadata<TRoute extends BaseRoute = BaseRoute> = DecoratorMetadataObject & {
    [routesSymbol]: Routes<TRoute>;
    [prefixSymbol]: string;
};

export type ExtendedModuleDecoratorMetadata = DecoratorMetadataObject & {
    [prefixSymbol]: string;
    [moduleSymbol]: boolean;
    [optionsSymbol]: ModuleOptions;
};

export type ModuleOptions = {
    controllers: Instantiable[];
};

export function isModuleOptions(obj: string | ModuleOptions): obj is ModuleOptions {
    return typeof obj !== 'string';
}

export function isClassMethodDecoratorContext(context: any): context is ClassMethodDecoratorContext {
    return (context as ClassMethodDecoratorContext).kind === 'method';
}

export function isClassDecoratorContext(context: any): context is ClassDecoratorContext {
    return (context as ClassDecoratorContext).kind === 'class';
}

// ===========================
// =====    Container    =====
// ===========================

type ClassProvider = Instantiable;
type ConstantProvider = any;
type FactoryProvider = Function;

export interface Container {
    id: symbol;
    register(config: Config): void;
    setup(configs: Config[]): void;
    get<T = unknown>(injectionToken: Instantiable<T> | InjectionTokenType): T;
    get spawns(): symbol[];
    spawn(copy?: boolean): Container;
    dispose(): void;
}

export type Registry = Map<symbol, Entry>;

export type Entry =
    | {
          type: 'class';
          value: ClassProvider;
      }
    | {
          type: 'factory';
          value: FactoryProvider;
      }
    | {
          type: 'constant';
          value: ConstantProvider;
      };

export type Instantiable<T = any> = {
    new (...args: any[]): T;
};

export type InjectionTokenType = string | InjectionToken;

export type ClassProviderShorthandConfig = {
    provide: Instantiable;
};

export function isClassProviderShorthandConfig(config: Config): config is ClassProviderShorthandConfig {
    const isShorthand = Object.keys(config).length === 1 && config.provide != null;
    return isShorthand;
}

export type ClassProviderConfig = {
    provide: Instantiable | InjectionTokenType;
    useClass: Instantiable;
};

export function isClassProviderConfig(config: Config): config is ClassProviderConfig {
    return (config as ClassProviderConfig).useClass !== undefined;
}

export type FactoryProviderConfig = {
    provide: InjectionTokenType;
    useFactory: (container: Container) => any;
};

export function isFactoryProviderConfig(config: Config): config is FactoryProviderConfig {
    return (config as FactoryProviderConfig).useFactory !== undefined;
}

export type SingletonProviderConfig<T = unknown> = {
    provide: Instantiable | InjectionTokenType;
    useSingleton: Instantiable<T>;
};

export function isSingletonProviderConfig(config: Config): config is SingletonProviderConfig {
    return (config as SingletonProviderConfig).useSingleton !== undefined;
}

export type ValueProviderConfig = {
    provide: InjectionTokenType;
    useValue: unknown;
};

export function isValueProviderConfig(config: Config): config is ValueProviderConfig {
    return (config as ValueProviderConfig).useValue !== undefined;
}

export type Config =
    | ClassProviderShorthandConfig
    | ClassProviderConfig
    | SingletonProviderConfig
    | FactoryProviderConfig
    | ValueProviderConfig;

// ============================
// =====    Middleware    =====
// ============================

export type MiddlewareType = Function | Middleware | MiddlewareFactory;
