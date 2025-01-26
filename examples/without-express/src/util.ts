import { Inject, Singleton } from 'wapidi/decorators';
import { CONFIG } from './tokens';
import { randomBytes } from 'node:crypto';

export type Config = {
    tokenLength: number;
};

@Singleton()
export class Util {
    @Inject(CONFIG) accessor #config: Config;

    generateToken() {
        return randomBytes(this.#config.tokenLength).toString('hex');
    }
}
