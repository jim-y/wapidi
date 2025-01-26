import express from 'express';
import type { RequestHandler } from 'express';
import { getRoutesMeta } from './helpers';
import { BaseRoute, Instantiable, PreparedRoute } from './types';

export const bind = <TRoute extends BaseRoute = BaseRoute>(Module: Instantiable) => {
    const router = express.Router();
    const isModule = Module[Symbol.metadata][Symbol.for('module')];

    let routes: PreparedRoute<TRoute>[] = [];

    if (isModule) {
        routes = Module[Symbol.metadata][Symbol.for('routes')] as PreparedRoute<TRoute>[];
    } else {
        routes = getRoutesMeta<TRoute>(Module);
    }

    for (const route of routes) {
        router[route.method](
            route.preparedPath,
            ...((route.middlewares ?? []) as RequestHandler[]),
            route.action as RequestHandler
        );
    }

    return router;
};
