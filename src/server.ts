import express from 'express';
import type { RequestHandler } from 'express';
import { getRoutes } from './helpers';
import { BaseRoute, Instantiable, PreparedRoute } from './types';

export const bind = <TRoute extends BaseRoute = BaseRoute>(Class: Instantiable) => {
    const router = express.Router();
    const routes: PreparedRoute<TRoute>[] = getRoutes<TRoute>(Class);

    for (const route of routes) {
        router[route.method](
            route.preparedPath,
            ...((route.middlewares ?? []) as RequestHandler[]),
            route.action as RequestHandler
        );
    }

    return router;
};
