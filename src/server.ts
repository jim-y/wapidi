import express from 'express';
import type { RequestHandler } from 'express';
import { getRoutes } from './helpers';
import { BaseRoute, Instantiable, MiddlewareType, PreparedRoute } from './types';
import { Middleware, MiddlewareFactory } from './Middleware';

export const bind = <TRoute extends BaseRoute = BaseRoute>(Class: Instantiable) => {
    const router = express.Router();
    const routes: PreparedRoute<TRoute>[] = getRoutes<TRoute>(Class);

    for (const route of routes) {
        const middlewares: MiddlewareType[] = [];
        if (route.middlewares) {
            for (const middleware of route.middlewares) {
                if (middleware instanceof MiddlewareFactory) {
                    middlewares.push(middleware.run(route));
                } else if (middleware instanceof Middleware) {
                    middlewares.push(middleware.run);
                } else {
                    middlewares.push(middleware);
                }
            }
        }
        router[route.method](route.preparedPath, middlewares as RequestHandler[], route.action as RequestHandler);
    }

    return router;
};
