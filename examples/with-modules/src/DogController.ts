import { Controller, Get } from 'wapidi';

@Controller('dog')
export class DogController {
    @Get()
    get(req, res) {
        res.json(['Kuglof']);
    }
}
