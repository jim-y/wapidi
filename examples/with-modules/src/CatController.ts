import { Controller, Get } from 'wapidi';

@Controller('cat')
export class CatController {
    @Get()
    get(req, res) {
        res.json(['Smaug', 'Shakira']);
    }
}