import { Container } from '.';

export { default as container, Container } from './container';
export * from './decorators';
export * from './bind';
export { default as InjectionToken } from './InjectionToken';

export type Config = {
    provide: any;
    useClass?: any;
    useFactory?: (container: Container) => any;
    useValue?: any;
    useSingleton?: any;
};

export type HTTPVerb = 'get' | 'post' | 'patch' | 'put' | 'delete';
export type BaseRoute = {
    method: HTTPVerb;
    path: string;
    action: string;
    middlewares: Function[];
};
