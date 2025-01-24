import { Controller, Inject, Get, Post } from 'wapidi';
import { CatService } from './CatService';
import { Request, Response } from 'express';

@Controller('cat')
export class CatController {
	@Inject(CatService) accessor catService: CatService;

	@Get()
	cats(req: Request, res: Response) {
		res.json(this.catService.getAll());
	}

	@Post()
	addCat(req: Request, res: Response) {
		this.catService.add(req.body);
		res.sendStatus(201);
	}
}
