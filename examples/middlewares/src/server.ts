import express, { NextFunction, Request, Response } from 'express';
import {
    Middleware,
    Middlewares,
    Controller,
    Get,
    Post,
    createRouteDecorator,
    BaseRoute,
    MiddlewareFactory,
} from 'wapidi';
import { bind } from 'wapidi/server';
import bodyParser from 'body-parser';

const ROLES = {
    user: 'user',
    admin: 'admin',
} as const;

const mockUser = {
    username: 'admin',
    password: 'Password1',
    roles: [ROLES.admin, ROLES.user],
};

type Route = BaseRoute & {
    requireRole: keyof typeof ROLES;
};

const authMiddleware = new Middleware((req: Request, res: Response, next: NextFunction) => {
    if (req.get('Authorization') !== 'Bearer <token>') {
        res.sendStatus(401);
    } else {
        next();
    }
});

const verifyRole = new MiddlewareFactory<Route>(route => (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) return res.sendStatus(401);

    const [type, value] = authHeader.split(' ');
    if (type && type === 'Basic' && value != null) {
        const [username, password] = Buffer.from(value, 'base64').toString('utf8').split(':');
        if (
            username === mockUser.username &&
            password === mockUser.password &&
            mockUser.roles.includes(route.requireRole)
        ) {
            next();
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

const RequireRole = (role: keyof typeof ROLES) => createRouteDecorator<Route>(route => (route.requireRole = role));

@Controller()
@Middlewares(authMiddleware.ignoreOn('test', 'testBreakOut'), bodyParser.json())
class AppController {
    @Post('ping')
    ping(req, res) {
        res.status(200);
        res.json(req.body);
    }

    @Get('test/:id')
    @Middlewares((req, res, next) => {
        if (req.params.id === '0') {
            next('route');
        } else {
            next();
        }
    })
    test(req, res) {
        res.json('test');
    }

    @Get('test/:id')
    @RequireRole(ROLES.admin)
    @Middlewares(verifyRole)
    testBreakOut(req, res) {
        res.json('testBreakOut');
    }
}

const app = express();
const port = 3000;

app.use('/api', bind(AppController));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
