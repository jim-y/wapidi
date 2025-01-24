import { Injectable } from '../src';

@Injectable()
export class CatService {
    getAllCats() {
        return ['smaug', 'shakira'];
    }
} 