import { Controller, Inject, Get, Post } from 'wapidi';
import { CatService } from './CatService';
import { Request, Response } from 'express';

@Controller('cat')
export class CatController {
    @Inject(CatService) accessor catService: CatService;

    @Get()
    getAll(req: Request, res: Response) {
        res.json(this.catService.getAll());
    }

    @Get(':name')
    get(req: Request, res: Response) {
        res.json(this.catService.getByName(req.params.name));
    }

    @Post()
    addCat(req: Request, res: Response) {
        this.catService.add(req.body);
        res.sendStatus(201);
    }
}
