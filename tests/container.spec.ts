import { suite, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { container, InjectionToken, WapidiError } from '../dist';
import type { Container } from '../dist';

suite('Container API', () => {
    before(() => container.dispose());
    afterEach(() => container.dispose());

    suite('spawn() & dispose()', () => {
        afterEach(() => container.dispose());
        test('spawning a new child container works', () => {
            const childContainer = container.spawn();
            assert.strictEqual(childContainer.id, container.spawns.at(0));
        });
        test('disposing child containers work', () => {
            let child1 = container.spawn();
            container.spawn();
            assert.strictEqual(container.spawns.length, 2);

            // Child containers may spawn new children themselves
            let subChild = child1.spawn();
            assert.strictEqual(subChild.id, child1.spawns.at(0));

            // disposing a child also removes itself from the parent's child cache
            // to free up references for GC
            child1.dispose();
            assert.strictEqual(child1.spawns.length, 0);

            // container no longer have a reference for the disposed child1
            assert.strictEqual(container.spawns.length, 1);
            assert.notStrictEqual(container.spawns.at(0), child1.id);
            child1 = null;
            subChild = null;

            // disposing in root level should remove all (remaining) childs
            container.dispose();
            assert.strictEqual(container.spawns.length, 0);
        });
    });

    suite('register() & get()', () => {
        test('registering an existing provider', async () => {
            class Service {}
            class Singleton {}
            const FACTORY = new InjectionToken();
            const SERVICE = new InjectionToken();
            const SINGLETON = new InjectionToken();
            const CONSTANT = new InjectionToken();
            let undertest: Container;

            before(() => {
                undertest = container.spawn();
                undertest.setup([
                    { provide: Service },
                    { provide: SERVICE, useClass: Service },
                    { provide: FACTORY, useFactory: () => {} },
                    { provide: 'factory', useFactory: () => {} },
                    { provide: Singleton, useSingleton: Singleton },
                    { provide: SINGLETON, useSingleton: Singleton },
                    { provide: 'constant', useValue: null },
                    { provide: CONSTANT, useValue: null },
                ]);
            });

            after(() => {
                undertest.dispose();
            });

            await test('registering the same provider throws an error', () => {
                assert.throws(() => {
                    undertest.register({ provide: Service });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: Service, useClass: Service });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: 'Service', useClass: Service });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: SERVICE, useClass: Service });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: FACTORY, useFactory: () => {} });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: 'factory', useFactory: () => {} });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: Singleton, useSingleton: Singleton });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: 'Singleton', useSingleton: Singleton });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: SINGLETON, useSingleton: Singleton });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: 'constant', useValue: null });
                }, WapidiError);
                assert.throws(() => {
                    undertest.register({ provide: CONSTANT, useValue: null });
                }, WapidiError);
            });
        });

        test('class provider', async () => {
            let undertest: Container;

            beforeEach(() => {
                undertest = container.spawn();
            });

            afterEach(() => {
                undertest.dispose();
            });

            await test('shorthand config', () => {
                class Service {}
                undertest.register({
                    provide: Service,
                });
                const instance = undertest.get(Service);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('with class as injection token', () => {
                class Service {}
                undertest.register({
                    provide: Service,
                    useClass: Service,
                });
                const instance = undertest.get(Service);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('string as injection token', () => {
                class Service {}
                const token = 'MyService';
                undertest.register({
                    provide: token,
                    useClass: Service,
                });
                const instance = undertest.get(token);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('InjectionToken as injection token', () => {
                class Service {}
                const SERVICE = new InjectionToken('service');
                undertest.register({
                    provide: SERVICE,
                    useClass: Service,
                });
                const instance = undertest.get(SERVICE);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('string access on shorthand', () => {
                class Service {}
                undertest.register({
                    provide: Service,
                });
                const instance = undertest.get('Service');
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('fresh instances', () => {
                class Service {
                    stamp = Symbol();
                }
                undertest.register({
                    provide: Service,
                });
                const instance1 = undertest.get<Service>(Service);
                const instance2 = undertest.get<Service>(Service);
                assert.notStrictEqual(instance1.stamp, instance2.stamp);
            });
        });

        test('singleton provider', async () => {
            let undertest: Container;

            beforeEach(() => {
                undertest = container.spawn();
            });

            afterEach(() => {
                undertest.dispose();
            });

            await test('with class as injection token', () => {
                class Service {}
                undertest.register({
                    provide: Service,
                    useSingleton: Service,
                });
                const instance = undertest.get(Service);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('string as injection token', () => {
                class Service {}
                const token = 'MyService';
                undertest.register({
                    provide: token,
                    useSingleton: Service,
                });
                const instance = undertest.get(token);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('InjectionToken as injection token', () => {
                class Service {}
                const SINGLETON = new InjectionToken();
                undertest.register({
                    provide: SINGLETON,
                    useClass: Service,
                });
                const instance = undertest.get(SINGLETON);
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('string access on shorthand', () => {
                class Service {}
                undertest.register({
                    provide: Service,
                    useSingleton: Service,
                });
                const instance = undertest.get('Service');
                assert(instance, 'The value fetched from di does not exist');
                assert(instance instanceof Service, 'The value fetched from di is not an instance of the given class');
            });

            await test('singleton instance', () => {
                class Service {
                    stamp = Symbol();
                }
                undertest.register({
                    provide: Service,
                    useSingleton: Service,
                });
                const instance1 = undertest.get<Service>(Service);
                const instance2 = undertest.get<Service>(Service);
                assert.strictEqual(instance1.stamp, instance2.stamp);
            });
        });

        test('factory provider', async () => {
            let undertest: Container;

            beforeEach(() => {
                undertest = container.spawn();
            });

            afterEach(() => {
                undertest.dispose();
            });

            await test('string as injection token', () => {
                undertest.register({
                    provide: 'factory',
                    useFactory: () => 'test',
                });
                const factory = undertest.get('factory');
                assert.strictEqual(factory, 'test');
            });

            await test('InjectionToken as injection token', () => {
                const FACTORY = new InjectionToken();
                undertest.register({
                    provide: FACTORY,
                    useFactory: () => 'test',
                });
                const factory = undertest.get(FACTORY);
                assert.strictEqual(factory, 'test');
            });

            await test('value generation of factory function', () => {
                const FACTORY = new InjectionToken();
                undertest.register({
                    provide: FACTORY,
                    useFactory: () => Symbol(),
                });
                const factory1 = undertest.get(FACTORY);
                const factory2 = undertest.get(FACTORY);
                assert.notStrictEqual(factory1, factory2);
            });
        });

        test('value provider', async () => {
            let undertest: Container;

            beforeEach(() => {
                undertest = container.spawn();
            });

            afterEach(() => {
                undertest.dispose();
            });

            await test('string as injection token', () => {
                undertest.register({
                    provide: 'env',
                    useValue: 'development',
                });
                const value = undertest.get('env');
                assert.strictEqual(value, 'development');
            });

            await test('InjectionToken as injection token', () => {
                const ENV = new InjectionToken();
                undertest.register({
                    provide: ENV,
                    useValue: 'development',
                });
                const value = undertest.get(ENV);
                assert.strictEqual(value, 'development');
            });

            await test('original value should be provided each time', () => {
                const SYM = new InjectionToken();
                undertest.register({
                    provide: SYM,
                    useValue: Symbol(),
                });
                const val1 = undertest.get(SYM);
                const val2 = undertest.get(SYM);
                assert.strictEqual(val1, val2);
            });
        });
    });

    suite('setup()', () => {
        test('registering multiple providers at once works', () => {
            const undertest = container.spawn();
            undertest.setup([
                {
                    provide: 'one',
                    useValue: 1,
                },
                {
                    provide: 'two',
                    useValue: 2,
                },
                {
                    provide: 'three',
                    useFactory: c => c.get<number>('one') + c.get<number>('two'),
                },
            ]);
            assert.strictEqual(undertest.get('one'), 1);
            assert.strictEqual(undertest.get('two'), 2);
            assert.strictEqual(undertest.get('three'), 3);
        });
    });
});
