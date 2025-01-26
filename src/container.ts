import { generateInjectionToken, isClassLike, isString, isFunction } from './helpers';
import { InjectionToken } from './InjectionToken';
import {
    isClassProviderConfig,
    isClassProviderShorthandConfig,
    isFactoryProviderConfig,
    isSingletonProviderConfig,
    isValueProviderConfig,
} from './types';
import { ConfigurationError, ContainerError, WapidiError } from './errors';
import type { Config, InjectionTokenType, Instantiable, Container, Registry, Entry } from './types';

class Store implements Container {
    id: Symbol = Symbol();

    #registry: Registry = new Map<Symbol, Entry>();
    #spawns: Store[] = [];
    #parent: Store;

    constructor(parent?: Store, registry?: Registry) {
        this.#parent = parent;
        if (registry) {
            this.#registry = registry;
        }
    }

    public spawn(copy: boolean = false): Container {
        const spawn: Store = copy ? new Store(this, this.#registry) : new Store(this);
        this.#spawns.push(spawn);
        return spawn;
    }

    public get spawns() {
        return this.#spawns.map(spawn => spawn.id);
    }

    public register(config: Config) {
        try {
            if (!config.provide) throw new ConfigurationError('config.provide must be provided');

            const [token, friendlyToken] = generateInjectionToken(config);

            if (this.#registry.has(token))
                throw new ContainerError(`The provider (${friendlyToken}) is already registered`);

            if (isFactoryProviderConfig(config)) {
                if (!isFunction(config.useFactory))
                    throw new ConfigurationError('`config.useFactory` should be a function');
                this.#registry.set(token, {
                    type: 'factory',
                    value: config.useFactory,
                });
            } else if (isSingletonProviderConfig(config)) {
                if (!isClassLike(config.useSingleton))
                    throw new ConfigurationError('`config.useSingleton` should be a class');
                this.#registry.set(token, {
                    type: 'constant',
                    value: new config.useSingleton(),
                });
            } else if (isValueProviderConfig(config)) {
                this.#registry.set(token, {
                    type: 'constant',
                    value: config.useValue,
                });
            } else if (isClassProviderConfig(config)) {
                if (!isClassLike(config.useClass)) throw new ConfigurationError('`config.useClass` should be a class');
                this.#registry.set(token, {
                    type: 'class',
                    value: config.useClass,
                });
            } else if (isClassProviderShorthandConfig(config)) {
                this.#registry.set(token, {
                    type: 'class',
                    value: config.provide,
                });
            } else {
                throw new ConfigurationError('Invalid configuration provided for `container.register()`');
            }
        } catch (error) {
            throw new WapidiError(error);
        }
    }

    public setup(configs: Config[]) {
        for (const config of configs) {
            this.register(config);
        }
    }

    public get<T>(injectionToken: Instantiable | InjectionTokenType): T {
        try {
            let token: Symbol;
            let friendlyName: string;

            if (isClassLike(injectionToken)) {
                token = Symbol.for(injectionToken.name);
                friendlyName = injectionToken.name;
            } else if (injectionToken instanceof InjectionToken) {
                token = injectionToken.token;
                friendlyName =
                    injectionToken.description ??
                    `[unnamed InjectionToken instance][token:${injectionToken.token.toString()}]`;
            } else if (isString(injectionToken)) {
                token = Symbol.for(injectionToken);
                friendlyName = injectionToken;
            } else {
                throw new ContainerError(`Invalid injectonToken type is provided for container.get(${friendlyName})`);
            }

            const entry = this.#registry.get(token);

            if (!entry) throw new ContainerError(`No provider found by the provided injectonToken: ${friendlyName}`);

            switch (entry.type) {
                case 'class': {
                    const instance = new entry.value();
                    return instance;
                }
                case 'constant': {
                    return entry.value;
                }
                case 'factory': {
                    return entry.value(this);
                }
                default:
                    throw new ContainerError('Unknown entry type. This is likely a bug in wapidi');
            }
        } catch (error) {
            throw new WapidiError(error);
        }
    }

    public dispose() {
        this.#registry.clear();
        for (const spawn of this.#spawns) {
            spawn.dispose();
        }
        if (this.#parent) {
            this.#parent.onChildDisposed(this.id);
        }
    }

    private onChildDisposed(childId: Symbol) {
        const childIndex = this.#spawns.findIndex(spawn => spawn.id === childId);
        if (childIndex > -1) {
            this.#spawns.splice(childIndex, 1);
        }
    }
}

export const container: Container = new Store();
