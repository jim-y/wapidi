import InjectionToken from './InjectionToken';

type ClassProvider = Instantiable;
type ConstantProvider = any;
type FactoryProvider = Function;

export interface Container {
    id: Symbol;
    register(config: Config): void;
    setup(configs: Config[]): void;
    get<T>(injectionToken: Instantiable | InjectionTokenType): T;
    get spawns(): Symbol[];
    spawn(copy?: boolean): Container;
    dispose(): void;
}

export type Registry = Map<Symbol, Entry>;

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

export type SingletonProviderConfig = {
    provide: Instantiable | InjectionTokenType;
    useSingleton: Instantiable;
};

export function isSingletonProviderConfig(config: Config): config is SingletonProviderConfig {
    return (config as SingletonProviderConfig).useSingleton !== undefined;
}

export type ValueProviderConfig = {
    provide: InjectionTokenType;
    useValue: any;
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

type HTTPVerb = 'get' | 'post' | 'patch' | 'put' | 'delete';

export type BaseRoute = {
    method: HTTPVerb;
    path: string;
    action: string;
    middlewares: Function[];
};

export function isClassMethodDecoratorContext(context: any): context is ClassMethodDecoratorContext {
    return (context as ClassMethodDecoratorContext).kind === 'method';
}

export function isClassDecoratorContext(context: any): context is ClassDecoratorContext {
    return (context as ClassDecoratorContext).kind === 'class';
}
