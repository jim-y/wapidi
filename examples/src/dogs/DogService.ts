import { Injectable, Inject } from 'wapidi';
import { DB } from '../database';
import type { Database } from '../database';

type Dog = {
    name: string;
    breed: string;
};

@Injectable()
export class DogService {
    @Inject(DB) accessor #db: Database;

    getAll() {
        return this.#db.get('dogs');
    }

    add(dog: Dog) {
        const dogs = this.#db.get('dogs');
        this.#db.set('dogs', [...dogs, dog]);
    }
}
