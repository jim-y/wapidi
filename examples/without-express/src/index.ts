import http from 'node:http';
import { container, getRoutes } from 'wapidi';
import { CONFIG } from './tokens';
import { Ctrl } from './controller';

container.register({
    provide: CONFIG,
    useValue: {
        tokenLength: 10,
    },
});

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    const routes = getRoutes(Ctrl);
    const exactMatch = routes.find(
        route => route.preparedPath === req.url && route.method.toLocaleLowerCase() === req.method.toLowerCase()
    );

    if (exactMatch) {
        exactMatch.action(req, res);
    } else {
        // do pattern matching for params
        // E.g
        //  req url =>  GET /api/resource/2
        //  route   =>  GET /api/resource/:id
        //  we might match this
        res.statusCode = 404;
        res.statusMessage = 'Not found';
        res.end();
    }
});
server.listen(8000, () => {
    console.log('HTTP Server started listening on port 8000');
});
