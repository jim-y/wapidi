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
}

class Container {
    #store = new Map<string, Entry>();

    public register(config: Config) {
        if (config.useFactory) {

        } else if (config.useValue) {

        } else {
            const _class = config.useClass ? config.useClass : config.provide;
            const token = _class.name;
            this.#store.set(token, {
                type: 'class',
                value: _class
            });
        }
    }

    public setup(configs: Config[]) {
        for (const config of configs) {
            this.register(config);
        }
    }

    public get<T>(token: any) {
        const entry = this.#store.get(token.name ?? token);

        if (!entry) throw new Error('No such entry');

        switch (entry.type) {
            case 'class': {
                const instance: T = new entry.value();
                return instance;
            }
            default: throw new Error('unknown type')
        }
    }
}

export default new Container();