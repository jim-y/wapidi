import express from 'express';
import container from './container';
import { join } from 'path/posix';

type Route = {
    method: string;
    path: string;
    action: string;
};

type Routes = Record<string, Route>;

export const bind = (module: any) => {
    const meta = module[Symbol.metadata];
    const router = express.Router();

    const routes: Routes = meta[Symbol.for('routes')];
    const controller = container.get(module);

    for (const route of Object.values(routes)) {
        router[route.method](
            join('/', meta[Symbol.for('prefix')], route.path),
            controller[route.action].bind(controller)
        );
    }

    return router;
};
