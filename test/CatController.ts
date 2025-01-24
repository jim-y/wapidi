import { Controller, Inject, Get, Post } from '../src';
import { CatService } from './CatService';
import { Request, Response } from 'express';

@Controller('cat')
export class CatController {

    @Inject(CatService) private catService: CatService;

    @Get()
    cats(req: Request, res: Response) {
        res.json(this.catService.getAllCats());
    }

    @Post('/add')
    addCat(req: Request, res: Response) {
        console.log('Added:', req.body)
        res.sendStatus(201);
    }
}