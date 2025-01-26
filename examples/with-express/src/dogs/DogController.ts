import { Controller, Get, Inject, Post, Middlewares, createRouteDecorator, BaseRoute } from 'wapidi';
import { NextFunction, Request, Response } from 'express';
import { DogService } from './DogService';
import { EnsureAuthenticated } from '../auth/middlewares';

type Route = BaseRoute & {
    role: string;
};

const RequireRole = (role: string) => (route: Route) => (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    if (!req.state || req.state.token !== role) {
        res.status(403).send('Insufficient role!');
        return;
    }

    next();
};

const EnsureAuthorized = (route: Route) => (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    if (!req.state || req.state.token !== route.role) {
        res.status(403).send('Insufficient role!');
        return;
    }

    next();
};

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
        this.#dogService.add(req.body);
        res.sendStatus(201);
    }
}
