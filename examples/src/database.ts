import { container, InjectionToken } from 'wapidi';

export const DB = new InjectionToken('database');

export type Database = Map<string, any>;

const db = new Map<string, any>();

export const initialize = () => {
    container.register({
        provide: DB,
        useValue: db,
    });

    db.set('cats', [
        {
            name: 'Smaug',
            breed: 'mix',
        },
        {
            name: 'Shakira',
            breed: 'sphinx',
        },
    ]);
    db.set('dogs', [
        {
            name: 'Kuglof',
            breed: 'mix',
        },
    ]);
};
