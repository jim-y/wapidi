import express from 'express';
import { bind } from '../src';
import { CatController } from './CatController';
import bodyParser from 'body-parser';

const app = express()
const port = 3000

app.use(bodyParser.json());

app.use('/api', bind(CatController));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});