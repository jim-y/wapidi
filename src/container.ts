import { InjectionToken } from './index';

type Entry = {
    type: 'class' | 'constant' | 'factory';
    value: any;
};

type Config = {
    provide: any;
    useClass?: any;
    useFactory?: () => any;
    useValue?: any;
    useSingleton?: any;
};

class Container {
    #store = new Map<string, Entry>();

    public register(config: Config) {
        let token = config.provide.name ?? config.provide;

        if (config.provide instanceof InjectionToken) {
            token = config.provide.token;
        }

        if (config.useFactory) {
            this.#store.set(token, {
                type: 'factory',
                value: config.useFactory,
            });
        } else if (config.useSingleton) {
            this.#store.set(token, {
                type: 'constant',
                value: new config.useSingleton(),
            });
        } else if (config.useValue) {
            this.#store.set(token, {
                type: 'constant',
                value: config.useValue,
            });
        } else {
            const _class = config.useClass ? config.useClass : config.provide;
            this.#store.set(_class.name, {
                type: 'class',
                value: _class,
            });
        }
    }

    public setup(configs: Config[]) {
        for (const config of configs) {
            this.register(config);
        }
    }

    public get<T>(injectionToken: any) {
        let token = injectionToken.name ?? injectionToken;

        if (injectionToken instanceof InjectionToken) {
            token = injectionToken.token;
        }

        const entry = this.#store.get(token);

        if (!entry) throw new Error('No such entry');

        switch (entry.type) {
            case 'class': {
                const instance: T = new entry.value();
                return instance;
            }
            case 'constant': {
                return entry.value;
            }
            case 'factory': {
                return entry.value(this);
            }
            default:
                throw new Error('unknown type');
        }
    }
}

export default new Container();
