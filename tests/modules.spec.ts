import { suite, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { container, Controller, Get, InjectionToken, Module, WapidiError } from '../dist';
import type { Container, PreparedRoute } from '../dist';

suite('Module API', () => {
    before(() => container.dispose());
    after(() => container.dispose());

    suite('@Module()', () => {
        beforeEach(() => container.dispose());

        test('@Module() works', () => {
            @Controller('cat')
            class CatCtrl {
                @Get(':id')
                get() {}
            }

            @Controller('dog')
            class DogCtrl {
                @Get(':id')
                get() {}
            }

            @Module('api', {
                controllers: [CatCtrl, DogCtrl],
            })
            class ApiModule {}

            const routes = ApiModule[Symbol.metadata][Symbol.for('routes')] as PreparedRoute[];

            assert.ok(routes);
            assert.ok(Array.isArray(routes));
            assert.strictEqual(routes.length, 2);
            assert.ok(routes[0].preparedPath);
            assert.ok(routes[1].preparedPath);
            assert.strictEqual(routes[0].preparedPath, '/api/cat/:id');
            assert.strictEqual(routes[1].preparedPath, '/api/dog/:id');
        });

        test('@Module() works without prefix', () => {
            @Controller('cat')
            class CatCtrl {
                @Get(':id')
                get() {}
            }

            @Controller('dog')
            class DogCtrl {
                @Get(':id')
                get() {}
            }

            @Module({
                controllers: [CatCtrl, DogCtrl],
            })
            class ApiModule {}

            const routes = ApiModule[Symbol.metadata][Symbol.for('routes')] as PreparedRoute[];

            assert.ok(routes);
            assert.ok(Array.isArray(routes));
            assert.strictEqual(routes.length, 2);
            assert.ok(routes[0].preparedPath);
            assert.ok(routes[1].preparedPath);
            assert.strictEqual(routes[0].preparedPath, '/cat/:id');
            assert.strictEqual(routes[1].preparedPath, '/dog/:id');
        });
    });
});
