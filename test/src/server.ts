import express from 'express';
import { bind } from 'wapidi';
import { CatController } from './CatController';
import bodyParser from 'body-parser';
import * as db from './database';

const app = express();
const port = 3000;

db.initialize();

app.use(bodyParser.json());

app.use('/api', bind(CatController));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
