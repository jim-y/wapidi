import { suite, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';

import {
    container,
    Controller,
    Get,
    Post,
    Patch,
    Put,
    Delete,
    createRouteDecorator,
    Singleton,
    Injectable,
    Inject,
    WapidiError,
    InjectionToken,
    Middlewares,
    BaseRoute,
} from '../dist';

suite('Decorator API', () => {
    before(() => container.dispose());
    after(() => container.dispose());

    suite('@Controller()', () => {
        beforeEach(() => container.dispose());
        test('decorating a class works & prefix', () => {
            @Controller('test')
            class Ctrl {}

            const ctrl = container.get(Ctrl);

            assert.ok(ctrl);
            assert.strictEqual(Ctrl[Symbol.metadata][Symbol.for('prefix')], 'test');
        });

        test('extending the route meta & createRouteDecorator works', () => {
            type Route = BaseRoute & { version: string; role: string };
            const Version = (version: string) => createRouteDecorator<Route>(route => (route.version = version));
            const Admin = createRouteDecorator<Route>(route => (route.role = 'admin'));

            @Controller()
            class Ctrl {
                @Get('resource')
                @Version('1.0')
                @Admin
                get() {}
            }

            const expectedRoutes = {
                get: {
                    method: 'get',
                    path: 'resource',
                    actionName: 'get',
                    version: '1.0',
                    role: 'admin',
                },
            };

            const routes = Ctrl[Symbol.metadata][Symbol.for('routes')];
            assert.ok(routes);
            assert.deepStrictEqual(expectedRoutes, routes);
        });

        test('decorating a class makes it a singleton', () => {
            @Controller()
            class Ctrl {
                id = Symbol();
            }

            const ctrl1 = container.get<Ctrl>(Ctrl);
            const ctrl2 = container.get<Ctrl>(Ctrl);

            assert.ok(ctrl1);
            assert.ok(ctrl2);
            assert.strictEqual(ctrl1, ctrl2);
            assert.strictEqual(ctrl1.id, ctrl2.id);
        });

        test('path object is correct & HTTP verbs work', () => {
            @Controller('api')
            class Ctrl {
                @Get('resource')
                get() {}

                @Post('resource')
                post() {}

                @Delete('/:id/dispose')
                delete() {}

                @Put('/:id/replace')
                put() {}

                @Patch('/:id/update')
                patch() {}
            }

            const expectedRoutes = {
                get: {
                    method: 'get',
                    path: 'resource',
                    actionName: 'get',
                },
                post: {
                    method: 'post',
                    path: 'resource',
                    actionName: 'post',
                },
                delete: {
                    method: 'delete',
                    path: '/:id/dispose',
                    actionName: 'delete',
                },
                put: {
                    method: 'put',
                    path: '/:id/replace',
                    actionName: 'put',
                },
                patch: {
                    method: 'patch',
                    path: '/:id/update',
                    actionName: 'patch',
                },
            };

            const routes = Ctrl[Symbol.metadata][Symbol.for('routes')];

            assert.ok(routes);
            assert.deepStrictEqual(expectedRoutes, routes);
        });

        test('getRoutes() works on a controller')
    });

    suite('@Injectable()', () => {
        beforeEach(() => container.dispose());

        test('@Injectable() works', () => {
            @Injectable()
            class Service {
                id = Symbol();
            }

            const serv1 = container.get<Service>(Service);
            const serv2 = container.get<Service>(Service);

            assert.ok(serv1);
            assert.ok(serv2);
            assert.notStrictEqual(serv1.id, serv2.id);
        });

        test('@Injectable(as) works', () => {
            const SERVICE = new InjectionToken('service');

            @Injectable(SERVICE)
            class Service {
                id = Symbol();
            }

            const serv1 = container.get<Service>(SERVICE);
            const serv2 = container.get<Service>(SERVICE);

            assert.ok(serv1);
            assert.ok(serv2);
            assert.notStrictEqual(serv1.id, serv2.id);
        });
    });

    suite('@Singleton()', () => {
        beforeEach(() => container.dispose());

        test('@Singleton() works', () => {
            @Singleton()
            class Service {
                id = Symbol();
            }

            const serv1 = container.get<Service>(Service);
            const serv2 = container.get<Service>(Service);

            assert.ok(serv1);
            assert.ok(serv2);
            assert.strictEqual(serv1.id, serv2.id);
        });

        test('@Singleton(as) works', () => {
            const SERVICE = new InjectionToken('service');

            @Singleton(SERVICE)
            class Service {
                id = Symbol();
            }

            const serv1 = container.get<Service>(SERVICE);
            const serv2 = container.get<Service>(SERVICE);

            assert.ok(serv1);
            assert.ok(serv2);
            assert.strictEqual(serv1.id, serv2.id);
        });
    });

    suite('@Inject()', () => {
        beforeEach(() => container.dispose());

        test('@Inject works', () => {
            container.register({
                provide: 'env',
                useValue: 'development',
            });

            @Injectable()
            class Logger {
                id = Symbol();
            }

            class Service {
                @Inject(Logger) accessor logger: Logger;
                @Inject('env') accessor env: string;
            }

            const instance = new Service();

            const logger = container.get<Logger>(Logger);

            assert.ok(logger);

            // @Injectable() producing two different instances
            assert.notStrictEqual(instance.logger.id, logger.id);

            assert.strictEqual(instance.env, 'development');

            // @Inject works even if the host class is not part of DI
            // in this example container.get(Service) should throw since we didn't register Service in DI
            assert.throws(() => container.get(Service), WapidiError);
        });

        test('multiple reads of the auto-accessor', () => {
            const LOGGER = new InjectionToken();
            const HELPER = new InjectionToken();

            @Injectable(LOGGER)
            class Logger {
                id = crypto.randomInt(0, 100);
                echo() {
                    return this.id;
                }
            }

            @Injectable(HELPER)
            class Helper {
                @Inject(LOGGER) accessor #logger: Logger = new Logger();

                getLoggerInstanceId() {
                    return this.#logger.id;
                }

                getEchoStream() {
                    return Array.from({ length: 4 }, () => this.#logger.echo()).join(' ');
                }

                attemptToOverrideAccessor() {
                    this.#logger = new Logger();
                }
            }

            const helper = container.get<Helper>(HELPER);
            const logger = container.get<Logger>(LOGGER);
            const loggerIdOnHelper = helper.getLoggerInstanceId();

            // Whenever we request a class provider from the Container it should return a new instance
            // In this example, it means, that the logger variable/instance should have a different id
            // than the logger instance on helper
            assert.notStrictEqual(logger.id, loggerIdOnHelper);

            // This tests if subsequent invocations of the auto-accessor won't generate a new instance
            // from the class provider. However, it is totally possible to create a new instance on
            // every this.#logger call. We might add support for this in future releases
            assert.strictEqual(
                helper.getEchoStream(),
                `${loggerIdOnHelper} ${loggerIdOnHelper} ${loggerIdOnHelper} ${loggerIdOnHelper}`
            );

            // Overriding the auto-access value should be forbidden
            assert.throws(() => helper.attemptToOverrideAccessor(), WapidiError);
        });

        test('Circular dependencies', () => {
            const LOGGER = new InjectionToken();
            const HELPER = new InjectionToken();

            @Injectable(LOGGER)
            class Logger {
                @Inject(HELPER) accessor #helper: Helper;

                log(msg: string) {
                    return `${this.#helper.getSnack()} ${msg}`;
                }
            }

            @Injectable(HELPER)
            class Helper {
                @Inject(LOGGER) accessor #logger: Logger;

                getSnack() {
                    return 'snack';
                }

                sayHello() {
                    return this.#logger.log('hello');
                }
            }

            const logger = container.get<Logger>(LOGGER);
            const helper = container.get<Helper>(HELPER);

            const msg = helper.sayHello();

            assert.ok(logger);
            assert.ok(helper);
            assert.strictEqual(msg, 'snack hello');
        });
    });

    suite('@Middlewares()', () => {
        beforeEach(() => container.dispose());

        test('@Middlewares() works on the class', () => {
            const MW = route => (req, res, next) => {
                if (route.decoratedProperty) {
                    // this
                } else {
                    // or that
                }
            };

            type Route = BaseRoute & { decoratedProperty: boolean };
            const Decorate = createRouteDecorator<Route>(route => (route.decoratedProperty = true));

            @Controller()
            @Middlewares([MW])
            class Ctrl {
                @Get()
                @Decorate
                get() {}
            }

            const route: BaseRoute & { decoratedProperty: boolean } =
                Ctrl[Symbol.metadata][Symbol.for('routes')]['get'];

            assert.ok(route.decoratedProperty);
            assert.ok(route.middlewares);
            assert.strictEqual(route.middlewares.length, 1);
        });

        test('@Middlewares() works on the method', () => {
            const MW = route => (req, res, next) => {
                if (route.decoratedProperty) {
                    // this
                } else {
                    // or that
                }
            };

            @Controller()
            class Ctrl {
                @Get()
                @Middlewares([MW])
                get() {}
            }

            const route: BaseRoute = Ctrl[Symbol.metadata][Symbol.for('routes')]['get'];

            assert.ok(route.middlewares);
            assert.strictEqual(route.middlewares.length, 1);
        });

        test('@Middlewares() order', () => {
            function A() {
                return () => {};
            }
            function B() {
                return () => {};
            }
            function C() {
                return () => {};
            }
            function D() {
                return () => {};
            }

            @Controller()
            @Middlewares([() => A, () => B])
            class Ctrl {
                @Get()
                @Middlewares([() => C, () => D])
                get() {}
            }

            const route: BaseRoute = Ctrl[Symbol.metadata][Symbol.for('routes')]['get'];

            assert.ok(route.middlewares);
            assert.strictEqual(route.middlewares.length, 4);
            assert.strictEqual(route.middlewares.at(0), A);
            assert.strictEqual(route.middlewares.at(1), B);
            assert.strictEqual(route.middlewares.at(2), C);
            assert.strictEqual(route.middlewares.at(3), D);
        });
    });

    suite('Class method decorator order', () => {
        beforeEach(() => container.dispose());

        test("Method decorator order doesn't matter", () => {
            type Route = BaseRoute & { version: string; role: string };
            const Version = (version: string) => createRouteDecorator<Route>(route => (route.version = version));
            const Admin = createRouteDecorator<Route>(route => (route.role = 'admin'));

            @Controller()
            class Ctrl {
                @Get('resource')
                @Version('1.0')
                @Admin
                get() {}

                @Admin
                @Version('1.0')
                @Post('resource')
                post() {}
            }

            const expectedRoutes = {
                get: {
                    method: 'get',
                    path: 'resource',
                    actionName: 'get',
                    version: '1.0',
                    role: 'admin',
                },
                post: {
                    method: 'post',
                    path: 'resource',
                    actionName: 'post',
                    version: '1.0',
                    role: 'admin',
                },
            };

            const routes = Ctrl[Symbol.metadata][Symbol.for('routes')];
            assert.ok(routes);
            assert.deepStrictEqual(expectedRoutes, routes);
        });
    });
});
