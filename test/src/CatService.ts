import { Inject, Injectable } from 'wapidi';
import { DB } from './database';
import type { Database } from './database';

type Cat = {
    name: string;
    breed: string;
};

@Injectable()
export class CatService {
    @Inject(DB) accessor db: Database;

    getAll() {
        return this.db.get('cats');
    }

    add(cat: Cat) {
        const cats = this.db.get('cats');
        this.db.set('cats', [...cats, cat]);
    }
}
