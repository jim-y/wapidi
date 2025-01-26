import express from 'express';
import { Module } from 'wapidi';
import { bind } from 'wapidi/server';
import { CatController } from './CatController';
import { DogController } from './DogController';

@Module('api', {
    controllers: [CatController, DogController],
})
class ApiModule {}

const app = express();
const port = 3000;

app.use(bind(ApiModule));

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
