import { Controller, Delete, Get } from 'wapidi';
import http from 'node:http';

@Controller('/api/resource')
export class Ctrl {
    @Get('all')
    getAll(req: http.IncomingMessage, res: http.ServerResponse) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(
            JSON.stringify([
                { id: 1, resourceName: 'asd' },
                { id: 2, resourceName: 'asd2' },
            ])
        );
    }

    @Get(':id')
    getById() {}

    @Delete(':id')
    deleteById() {}
}
