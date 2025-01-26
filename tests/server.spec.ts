import { suite, test, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

import { container, Controller, Module, Get, Middlewares } from '../dist';

suite('Server API', async () => {
    const getMock = mock.fn();
    let server;

    before(async () => {
        mock.module('express', {
            namedExports: {
                Router: mock.fn(() => ({
                    get: getMock,
                })),
            },
        });
        server = await import('../dist/server.js');
    });

    afterEach(() => {
        container.dispose();
        getMock.mock.resetCalls();
    });

    await test('bind() works for Controllers', () => {
        @Controller('cat')
        class CatCtrl {
            @Get(':id')
            get() {}
        }

        server.bind(CatCtrl);
        const calls = getMock.mock.calls;

        // Assert preparedPath
        assert.deepStrictEqual(calls[0].arguments[0], '/cat/:id');
    });

    await test('bind() works for Modules', () => {
        @Controller('cat')
        class CatCtrl {
            @Get(':id')
            get() {}
        }

        @Controller('dog')
        @Middlewares([() => () => {}])
        class DogCtrl {
            @Get(':id')
            @Middlewares([() => () => {}])
            get() {
                return 100;
            }
        }

        @Module('/api', {
            controllers: [CatCtrl, DogCtrl],
        })
        class AppModule {}

        server.bind(AppModule);

        const calls = getMock.mock.calls;
        const callCount = getMock.mock.callCount();

        // bind() binds 2 routes from 2 controllers
        assert.strictEqual(callCount, 2);

        // assert preparedPaths if it contains the modulePrefix
        assert.strictEqual(calls[0].arguments[0], '/api/cat/:id');
        assert.strictEqual(calls[1].arguments[0], '/api/dog/:id');

        // second route binding should register middleware functions as well
        assert.strictEqual(calls[1].arguments.length, 4);
        assert.strictEqual(typeof calls[1].arguments[1], 'function');
        assert.strictEqual(typeof calls[1].arguments[2], 'function');
        assert.strictEqual(typeof calls[1].arguments[3], 'function');

        // last argument should be the handler
        assert.strictEqual(calls[1].arguments[3](), 100);
    });
});
