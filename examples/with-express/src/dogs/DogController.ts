import { Controller, Get, Inject, Post, Middlewares, createRouteDecorator, BaseRoute, MiddlewareFactory } from 'wapidi';
import { NextFunction, Request, Response } from 'express';
import { DogService } from './DogService';
import { EnsureAuthenticated } from '../auth/middlewares';

type Route = BaseRoute & {
    role: string;
};

const RequireRole = (role: string) =>
    new MiddlewareFactory<Route>(() => (req: Request, res: Response, next: NextFunction) => {
        if (!res.locals.state || res.locals.state.token !== role) {
            res.status(403).send('Insufficient role!');
            return;
        }
        next();
    });

const EnsureAuthorized = new MiddlewareFactory<Route>(route => (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.state || res.locals.state.token !== route.role) {
        res.status(403).send('Insufficient role!');
        return;
    }
    next();
});

const Role = (role: Route['role']) => createRouteDecorator<Route>(route => (route.role = role));

@Controller('dog')
@Middlewares([EnsureAuthenticated])
export class DogController {
    @Inject(DogService) accessor #dogService: DogService;

    @Get()
    @Role('user')
    @Middlewares([EnsureAuthorized])
    getAll(req: Request, res: Response) {
        res.json(this.#dogService.getAll());
    }

    @Post()
    @Middlewares([RequireRole('admin')])
    add(req: Request, res: Response) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.#dogService.add(req.body);
        res.sendStatus(201);
    }
}
