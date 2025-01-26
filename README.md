# WAPIDI

A lightweight web api framework with dependency injection for Typescript projects.

-   <a href="#installation">Installation</a>
-   <a href="#usage">Usage</a>
-   <a href="#philosophy">Philosophy</a>
-   <a href="#api">Decorator API</a>
    -   <a href="#api.controller">@Controller()</a>
    -   <a href="#api.injectable">@Injectable()</a>
    -   <a href="#api.singleton">@Singleton()</a>
    -   <a href="#api.inject">@Inject()</a>
    -   <a href="#api.verbs">HTTP Verbs</a>
    -   <a href="#api.middlewares">@Middlewares()</a>
    -   <a href="#api.create.middlewares">createRouteDecorator()</a>
-   <a href="#container">Container API</a>
    -   <a href="#container.injectiontoken">InjectionToken()</a>
    -   <a href="#container.register">register()</a>
    -   <a href="#container.setup">setup()</a>
    -   <a href="#container.get">get()</a>
    -   <a href="#container.spawn">spawn()</a>
    -   <a href="#container.dispose">dispose()</a>
-   <a href="#server">Server API</a>
    -   <a href="#server.bind">bind()</a>
-   <a href="#route">Route</a>
-   <a href="#examples">Examples</a>
-   <a href="#no-express">Not using express?</a>
    -   <a href="no-express.routes">getRoutesMeta()</a>

<h2 id="installation">Installation</h2>

With npm (using express):

```bash
npm install --save wapidi
```

With npm (not using express)

```bash
npm install --save wapidi --omit=optional
```

Wapidi relies on new typescript features like the stage 3 decorators introduced in typescript 5.0 and the decorator metadata feature introduced in version 5.2. This means you should at least be on version 5.2 of typescript.

`express` and `typescript` are peer-dependencies (`express` being optional, see <a href="#no-express">Not using express?</a> section) but other than these two there are no other deps so wapadi is extremely lightweight.

Enable these flags in your tsconfig.json file to support the decorator metadata feature as suggested by the [typescript docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata).

```json
{
    "target": "ES2023",
    "module": "Node16",
    "lib": ["ES2023", "ESNext"],
    "strictPropertyInitialization": false
}
```

<h2 id="usage">Usage</h2>

You can import all `wapidi` api from the main module

```ts
import { container, Controller, WapidiError } from 'wapidi';
```

or you can import from sub-modules. Importing from sub-modules might help your bundler (if any) with tree-shaking

```ts
import { container } from 'wapidi/container';
import { WapidiError } from 'wapidi/errors';
import type { Container } from 'wapidi/types';
```

<h2 id="philosophy">Philosophy</h2>

This lightweight web api framework is opinionated but it helps managing your api routes with decorators and dependency injection.

### What does it bring to the table?

-   It uses dependency injection relying on stage:3 decorators implemented by typescript, as opposed to legacy decorators
-   It provides a very lightweight solution of structuring your api endpoints under controller domains and business logic into reusable services
-   Integrates with `express`-like frameworks, but offers solutions outside of `express`

### What is it NOT?

-   It is NOT a fully-fledged node framework which tries to solve everything
-   It tries to solve one (two) problems but aims to solve those well

It enforces using controllers for managing endpoints. The controllers might inject services, and services handle the business logic. Each endpoint is represented by a "hidden" route object. You can decorate this route object with decorators and consume it with middlewares.

In typescript there are 2 decorator implementations:

1. [Experimental decorators](https://www.typescriptlang.org/docs/handbook/decorators.html#handbook-content)
2. [ECMAScript decorators](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators)

The former is available for a long time in typescript, and other dependency injection implementations rely on them.

The latter implementation was "recently" (March 16th, 2023) added in Typescript 5.0 and it doesn't rely on `reflect-metadata` and it implements [tc39/proposal-decorators](https://github.com/tc39/proposal-decorators).

There are certain limitations though. Maybe the most important which you should be aware of, is that the stage: 3 proposal doesn't add support for class constructor parameter decorators. This means, that in this package we do field injections, or even more precisely auto-accessor field injections:

```ts
/// Instead of
class Ctrl {
    constructor(@Inject(DB) private db: Database) {}
}

/// We do
class Ctrl {
    @Inject(DB) accessor #db: Database;
}
```

### Example

_CatController.ts_
```ts
@Controller('cat')
class CatController {
    @Inject(CatService) accessor #catService: CatService;

    @Get()
    async getAll(req: Request, res: Response) {
        res.json(await this.#catService.getAllCats());
    }

    @Get(':name')
    async get(req: Request, res: Response) {
        res.json(await this.#catService.getByName(req.params.name));
    }
}
```

_CatService.ts_
```ts
@Injectable()
export class CatService {
    @Inject(DB) accessor #db: Database;

    getAll() {
        // fetch cats from db
    }

    getByName(name: Cat['name']) {
        // fetch cat from db by name
    }
}
```

<h2 id="api">Decorator API</h2>

<h3 id="api.controller">@Controller()</h3>

Class decorator factory. Can be used on a class with a path prefix as parameter. Can be used to construct endpoints under a similar domain.

Usage:

```ts
import { Controller, Get } from 'wapidi';

@Controller('/v1/cat')
export class CatController {
    @Get()
    get(req: Request, res: Response) {
        res.json(['smaug', 'shaki']);
    }
}

/// In your main server.ts file:

import express from 'express';
import { bind } from 'wapidi/server';
import { CatController } from './CatController';

const app = express();

app.use('/api', bind(CatController));
```

Then your endpoint is reachable

```http
GET http://localhost:3000/api/v1/cat HTTP/1.1
```

<h3 id="api.injectable">@Injectable()</h3>

Class decorator factory. Marks a class as injectable by dependency injection.

Usage:

```ts
import { Injectable } from 'wapidi';

@Injectable()
export class EchoService {
    echo() {
        return 'echo';
    }
}
```

Consuming the provider can be done either by using the `Inject()` decorator in another injectable, or getting it from the IoC container. For every dependable creates a new instance.

```ts
/// either

@Injectable()
class SomeClass {
    @Inject(EchoService) accessor #echoService: EchoService;
}

/// or

async function EnsureAuthenticated(req, res, next) {
    const echoServiceInstance = container.get<EchoService>(EchoService);
    // ...
}
```

<h3 id="api.singleton">@Singleton()</h3>

Class decorator factory. Marks a class as injectable by dependency injection.

Usage:

```ts
import { Singleton } from 'wapidi';

@Singleton()
export class EchoService {
    echo() {
        return 'echo';
    }
}
```

Consuming the provider can be done either by using the `Inject()` decorator factory in a class, or getting it from the IoC container. For every dependable it shares a singleton instance.

<h3 id="api.inject">@Inject()</h3>

Class accessor field decorator factory. Injects a value from the IoC container to the field.

Usage:

```ts
@Injectable()
class SomeClass {
    @Inject(EchoService) accessor echoService: EchoService;
}
```

**Notes**: the host class does NOT have to be part of the IoC container.

<h3 id="api.verbs">HTTP Verbs</h3>

Registers the host controller's decorated method in the routes object.

The decorator factory adds the following properties to the route object:

-   path (optional)
-   method
-   actionName

The host class must be decorated with `@Controller()`.

### @Get()

Usage:

```ts
import { Controller, Get } from 'wapidi';

@Controller('cat')
class CatController {
    @Get(':id')
    getById(req: Request, res: Response) {
        // ...
    }
}
```

### @Post()

Usage:

```ts
import { Controller, Post } from 'wapidi';

@Controller('cat')
class CatController {
    @Post()
    create(req: Request, res: Response) {
        // ...
    }
}
```

### @Put()

Usage:

```ts
import { Controller, Put } from 'wapidi';

@Controller('cat')
class CatController {
    @Put()
    replace(req: Request, res: Response) {
        // ...
    }
}
```

### @Patch()

Usage:

```ts
import { Controller, Patch } from 'wapidi';

@Controller('cat')
class CatController {
    @Patch()
    update(req: Request, res: Response) {
        // ...
    }
}
```

### @Delete()

Usage:

```ts
import { Controller, Delete } from 'wapidi';

@Controller('cat')
class CatController {
    @Delete()
    delete(req: Request, res: Response) {
        // ...
    }
}
```

<h3 id="api.middlewares">@Middlewares()</h3>

Class or class method decorator factory. Applies middlewares to certain endpoints on a controller. When applied as a class decorator factory then every endpoint on the controller gets the middleware, otherwise only the endpoint on which it was applied gets it.

Usage:

```ts
import { Controller, Middlewares } from 'wapidi';

@Controller('dog')
@Middlewares([EnsureAuthenticated])
export class DogController {
    @Inject(DogService) accessor dogService: DogService;

    @Post()
    @Middlewares([RequireRole('admin')])
    add(req: Request, res: Response) {
        this.dogService.add(req.body);
        res.sendStatus(201);
    }
}
```

`EnsureAuthenticated` will be applied to every endpoint this controller registers, while `RequireRole` will be only applied to `add()`.

#### What is a middleware?

A middleware is a traditional express-like middleware, except, that you have to write middleware factories as the route meta object will be available for the middleware.

Example:

```ts
const RequireRole = (requiredRole: string) => (route: Route) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.state || req.state.roleFromToken !== requiredRole) {
        res.status(403).send('Insufficient role!');
        return;
    }
    next();
};
```

In this example we didn't use the `route` object for anything, but it is possible to implement the require role middleware different.

1. we can create a custom decorator factory to decorate the route object with a role property
2. then write a middleware to validate the route object against the role info from an access token

Example:

```ts
const EnsureAuthorized = (route: Route) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.state || req.state.roleFromToken !== route.role) {
        // Mind we used route.role here!
        res.status(403).send('Insufficient role!');
        return;
    }
    next();
};

const RequiredRole = (role: Route['role']) => createRouteDecorator<Route>(route => (route.role = role));

@Controller('dog')
@Middlewares([EnsureAuthenticated])
export class DogController {
    @Inject(DogService) accessor dogService: DogService;

    @Get()
    @RequiredRole('user')
    @Middlewares([EnsureAuthorized])
    getAll(req: Request, res: Response) {
        res.json(this.dogService.getAll());
    }
}
```

#### Order of middlewares

When we apply middlewares both on the controller and on an endpoint it's important to note the order on which they get applied/called.

```ts
@Controller()
@Middlewares([
    A, // runs first
    B, // second
])
class Ctrl {
    @Post()
    @Middlewares([
        C, // third
        D, // fourth
    ])
    method() {}
}
```

<h3 id="api.create.middlewares">createRouteDecorator()</h3>

Helper function to generate custom route decorators. Decorators which can decorate the route object.

Usage:

```ts
const Version = (version: string) => createRouteDecorator<Route>(route => (route.version = version));

@Controller('dog')
export class DogController {
    @Inject(DogService) accessor dogService: DogService;

    @Delete(':id')
    @Version('2')
    async delete(req: Request, res: Response) {
        await this.dogService.delete(req.params.id);
        res.sendStatus(200);
    }
}
```

Decorating the underlying `Route` object for an endpoint let's you extend your app's functionality. Middlewares can interact with the route object. For example, you can create a decorator factory to define the request schema then create a middleware which validates it. The schema validator middleware could be applied to the controller so that every endpoint might have schema validation if the route object contains a schema object.

<h2 id="container">Container API</h2>

### container

There is a "global" Inversion of Control (IoC) container and you can access it as

```ts
import { container } from 'wapidi';
```

You give the container a token, a so-called injection token, and in exchange you get back a provider.

The provider can be an instance, a singleton, a factory function or an arbitrary value.

The `Inject()` class-method decorator factory attempts to inject a provider from the IoC container to the class but first, you have to register the provider to the container.

Likewise, you can access providers directly from the container with `container.get()`.

Usage:

```ts
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
```

<h3 id="container.injectiontoken">InjectionToken()</h3>

When registering a provider to the container you have to provide a unique token which identifies the provider.

The injection token can be one of 3 things:

1. a constructor type, that is, a class or function which is instantiable
2. a string
3. or an `InjectionToken` instance

```ts
export type Instantiable<T = any> = {
    new (...args: any[]): T;
};

export type InjectionTokenType = string | InjectionToken;
```

Examples:

#### constructor type

```ts
container.register({
    provide: SomeClass, // SomeClass is an ES6 class
});
```

#### string

```ts
container.register({
    provide: 'env',
    useValue: 'development',
});
```

#### InjectionToken

Every instance of the `InjectionToken(description?)` class is guaranteed to provide a unique injection token to use. You can provide a description which will be used in error messages and debugging.

```ts
const LOGGER = new InjectionToken('logger');
container.register({
    provide: LOGGER,
    useClass: Logger,
});
```

<h3 id="container.register">register()</h3>

Registers a provider to the container.

Usage:

```ts
import { container, InjectionToken } from 'wapidi';

/// class
container.register({
    provide: UserService,
    useClass: UserService
});

export type ClassProviderConfig = {
    provide: Instantiable | InjectionTokenType;
    useClass: Instantiable;
};

/// class shorthand
container.register({
    provide: UserService
});

export type ClassProviderShorthandConfig = {
    provide: Instantiable;
};

/// singleton
container.register({
    provide: DBHelper,
    useSingleton: DBHelper,
});

export type SingletonProviderConfig = {
    provide: Instantiable | InjectionTokenType;
    useSingleton: Instantiable;
};

/// factory
container.register({
    provide: Logger,
    useFactory: (container) => Logger,
});

export type FactoryProviderConfig = {
    provide: InjectionTokenType;
    useFactory: (container: Container) => any;
};

/// value
const CONFIG = new InjectionToken('application config');
container.register({
    provide: CONFIG,
    useValue: { ... }
});

export type ValueProviderConfig = {
    provide: InjectionTokenType;
    useValue: any;
};
```

<h3 id="container.setup">setup()</h3>

Batch registration of providers on the container.

Usage:

```ts
import { container, InjectionToken } from 'wapidi';

const ENV = new InjectionToken('env');
const LOGGER = new InjectionToken('logger factory');

container.setup([
    {
        provide: ENV,
        useValue: process.env.NODE_ENV ?? 'development',
    },
    {
        provide: UserService,
    },
    {
        provide: LOGGER,
        useFactory: (container: Container) => {
            const env = container.get(ENV);
            return env === 'development' ? 'this' : 'that';
        },
    },
]);
```

<h3 id="container.get">get()</h3>

Get a provider from the container in exchange for an injection token.

Usage:

```ts
import { container } from 'wapidi';

container.get<ConfigType>(CONFIG);
```

<h3 id="container.spawn">spawn()</h3>

Spawns a new child container. A child container behaves similarly than the parent container except decorators will
register providers **only** on the global container and not on children.

Usage:

```ts
const childContainer = container.spawn();

childContainer.register(...);
childContainer.get(...);
// ...
```

<h3 id="container.dispose">dispose()</h3>

Disposes the container and all of it's children.

<h2 id="server">Server API</h3>

<h3 id="server.bind">bind()</h3>

Binds controller endpoints to an express instance. Similar to how one would bind an express Router instance to an express instance.

**Note**: unlike any other function, you have to import this from `wapidi/server`. This ensures that one can use `wapidi` without express. See the <a href="#no-express">Not using express?</a> section.

Usage:

```ts
import express from 'express';
import { bind } from 'wapidi/server';
import { CatController } from './CatController';
import { DogController } from './DogController';

const app = express();

app.use('/api', bind(CatController));
app.use(bind(DogController));
```

<h2 id="route">Route</h2>

In `wapidi` every endpoint of your api is represented by a `BaseRoute` object.

```ts
export type HTTPVerb = 'get' | 'post' | 'patch' | 'put' | 'delete';
export type BaseRoute = {
    method: HTTPVerb;
    path: string;
    actionName: string;
    middlewares: Function[];
};
```

When you create a route decorator | decorator factory you extend this route object with new properties. You can add new properties for the route object with <a href="#api.create.middlewares">createRouteDecorator()</a>

To ensure type correctness in `createRouteDecorator()` you can provide a generic type parameter which extends `BaseRoute`. That is, if your decorator factory would add a new route property **_requiredRole_**, then you should create a new type

```ts
import type { BaseRoute } from 'wapidi/types';

export const Route = BaseRoute & {
    requiredRole: string;
}
```

then provide this new type as a generic type parameter for `createRouteDecorator()`:

```ts
const RequiredRole = (requiredRole: string) =>
    createRouteDecorator<Route>(route => {
        // route.requiredRole is type safe here because of `Route`
        route.requiredRole = requiredRole;
    });

/// then use it as a decorator factory

@Get()
@RequiredRole('admin')
get() {}
```

Extending the route object is useful because your middlewares can access the endpoint's route object and validate by them.

<h2 id="examples">Examples</h2>

Please check the [examples](https://github.com/jim-y/wapidi/tree/main/examples) folder for examples

<h2 id="no-express">Not using express?</h2>

If you don't use `express` but still want to use `wapidi` you can install `wapidi` by omitting installing `express` as

```bash
npm install wapidi --omit=optional
```

Then, you loose the ability to use our express helpers from `wapidi/server`.

The `wapidi/server` module references express, so you can safely use `wapidi` without installing `express` if you won't reference `wapidi/server` in your codebase.

For example, the [examples/without-express](https://github.com/jim-y/wapidi/tree/main/examples/without-express) example shows how one could use wapidi using vanilla node `http(s).createServer` utilisng the `getRoutesMeta()` helper function.

This example **doesn't** have `express` installed as dependency.

<h3 id="no-express.routes">getRoutesMeta()</h3>

If you don't want to use `express` you still can use the Decorator API and the dependency injector. You still want to access the routes what the controllers generate. For such cases you can use the `getRoutesMeta()` helper function to access the generated routes.

Usage:

```ts
import { getRoutesMeta } from 'wapidi';

const routes = getRoutesMeta(Ctrl); // Ctrl is a class decorated with @Controller()
```
