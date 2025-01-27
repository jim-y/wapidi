import { BaseRoute } from './types';

export class Middleware {
    #run: Function;
    #ignoredRoutes: string[] = [];

    get run(): Function {
        return this.#run;
    }

    get ignoredRoutes(): string[] {
        return this.#ignoredRoutes;
    }

    ignoreOn(ignoredRoutes: string | string[], ...rest: string[]): Middleware {
        if (Array.isArray(ignoredRoutes)) {
            this.#ignoredRoutes = ignoredRoutes;
        } else if (typeof ignoredRoutes === 'string') {
            this.#ignoredRoutes = [ignoredRoutes, ...rest];
        }
        return this;
    }

    constructor(middlewareFunction: Function) {
        this.#run = middlewareFunction; 
    }
}

export class MiddlewareFactory<TRoute extends BaseRoute = BaseRoute> {
    #run: (route: TRoute) => Function;
    #ignoredRoutes: string[] = [];

    get run(): (route: TRoute) => Function {
        return this.#run;
    }

    get ignoredRoutes(): string[] {
        return this.#ignoredRoutes;
    }

    ignoreOn(ignoredRoutes: string | string[], ...rest: string[]): MiddlewareFactory<TRoute> {
        if (Array.isArray(ignoredRoutes)) {
            this.#ignoredRoutes = ignoredRoutes;
        } else if (typeof ignoredRoutes === 'string') {
            this.#ignoredRoutes = [ignoredRoutes, ...rest];
        }
        return this;
    }

    constructor(middlewareFactoryFunction: (route: TRoute) => Function) {
        this.#run = middlewareFactoryFunction;
    }
}
