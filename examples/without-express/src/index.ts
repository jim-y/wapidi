import { container } from 'wapidi/container';
import { Util } from './util';
import { CONFIG } from './tokens';

container.register({
    provide: CONFIG,
    useValue: {
        tokenLength: 10
    }
});

const util = container.get<Util>(Util);

console.log(util.generateToken());
