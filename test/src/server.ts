import express from 'express';
import { container, bind } from 'wapidi';
import { CatController } from './cats/CatController';
import bodyParser from 'body-parser';
import * as db from './database';
import { DogController } from './dogs/DogController';
import { ENV, LOGGER } from './tokens';
import { factory as loggerFactory } from './logger';

const app = express();
const port = 3000;

container.setup([
    {
        provide: ENV,
        useValue: process.env.NODE_ENV ?? 'development',
    },
    {
        provide: LOGGER,
        useFactory: loggerFactory,
    },
]);

db.initialize();

app.use(bodyParser.json());

app.use('/api', bind(CatController));

app.use(bind(DogController));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
