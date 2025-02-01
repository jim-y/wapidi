# WAPIDI

A lightweight web api framework with dependency injection for Typescript projects with first-class support for [expressjs](https://expressjs.com/).

- [WAPIDI](#wapidi)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Philosophy](#philosophy)
    - [What does it bring to the table?](#what-does-it-bring-to-the-table)
    - [What is it NOT?](#what-is-it-not)
    - [Basic Example](#basic-example)
  - [Decorator API](#decorator-api)
    - [@Controller()](#controller)
    - [@Injectable()](#injectable)
    - [@Singleton()](#singleton)
    - [@Inject()](#inject)
    - [HTTP Verbs](#http-verbs)
    - [@Get()](#get)
    - [@Post()](#post)
    - [@Put()](#put)
    - [@Patch()](#patch)
    - [@Delete()](#delete)
    - [@Middlewares()](#middlewares)
      - [What is a middleware?](#what-is-a-middleware)
        - [Function](#function)
        - [Middleware](#middleware)
        - [MiddlewareFactory](#middlewarefactory)
      - [Order of the middlewares](#order-of-the-middlewares)
    - [createRouteDecorator()](#createroutedecorator)
    - [@Module()](#module)
  - [Container API](#container-api)
    - [container](#container)
    - [InjectionToken()](#injectiontoken)
      - [constructor type](#constructor-type)
      - [string](#string)
      - [InjectionToken](#injectiontoken-1)
    - [register()](#register)
    - [setup()](#setup)
    - [get()](#get-1)
    - [spawn()](#spawn)
    - [dispose()](#dispose)
  - [Server API](#server-api)
    - [bind()](#bind)
  - [Route](#route)
  - [Examples](#examples)
  - [Not using express?](#not-using-express)
    - [getRoutes()](#getroutes)


## Installation

With npm (using express):

```bash
npm install --save wapidi
```

With npm (not using express)

```bash
npm install --save wapidi --omit=optional
```

Wapidi relies on new typescript features like the stage 3 decorators introduced in typescript 5.0 and the decorator metadata feature introduced in version 5.2. This means you should at least be on version 5.2 of typescript.

`express` and `typescript` are peer-dependencies (`express` being optional, see [Not using express?](#not-using-express) section) but other than these two there are no other deps so `wapidi` is extremely lightweight.

Enable these flags in your tsconfig.json file to support the decorator metadata feature as suggested by the [typescript docs](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata).

```json
{
    "target": "ES2023",
    "module": "Node16",
    "lib": ["ES2023", "ESNext"],
    "strictPropertyInitialization": false
}
```

## Usage

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

## Philosophy

This lightweight web api framework is opinionated but it helps managing your api routes with decorators and dependency injection.

### What does it bring to the table?

- It uses dependency injection relying on stage:3 decorators implemented by typescript, as opposed to legacy decorators
- It provides a very lightweight solution of structuring your api endpoints under controller domains and business logic into reusable services
- Integrates with `express`-like frameworks, but offers solutions outside of `express`

### What is it NOT?

- It is NOT a fully-fledged node framework which tries to solve everything
- It tries to solve one (two) problems but aims to solve those well

It enforces using controllers for managing endpoints. The controllers might inject services, and services handle the business logic. Each endpoint is represented by a "hidden" route object. You can decorate this route object with decorators and consume it with middlewares.

In typescript there are 2 decorator implementations:

1. [Experimental decorators](https://www.typescriptlang.org/docs/handbook/decorators.html#handbook-content)
2. [ECMAScript decorators](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators)

The former is available for a long time in typescript, and other dependency injection implementations rely on them.

The latter implementation was "recently" (March 16th, 2023) added in Typescript 5.0 and it doesn't rely on `reflect-metadata` and it implements [tc39/proposal-decorators](https://github.com/tc39/proposal-decorators). We are using this implementation in this project.

There are certain limitations though. The tc39 decorators proposal doesn't add support for constructor parameter decorators. This means, that in this package we use auto-accessor field injections.

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

### Basic Example

For more examples, please check the [examples](examples) folder.

CatController.ts

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

CatService.ts

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

## Decorator API

### @Controller()

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

### @Injectable()

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

### @Singleton()

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

### @Inject()

Class accessor field decorator factory. Injects a value from the IoC container to the field.

Usage:

```ts
@Injectable()
class SomeClass {
    @Inject(EchoService) accessor echoService: EchoService;
}
```

**Notes**: the host class does NOT have to be part of the IoC container.

### HTTP Verbs

Registers the host controller's decorated method in the routes object.

The decorator factory adds the following properties to the route object:

- path (optional)
- method
- actionName

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

### @Middlewares()

Class or class method decorator factory. Applies middlewares to certain endpoints on a controller. When applied as a class decorator factory then every endpoint on the controller gets the middleware, otherwise only the endpoint on which it was applied gets it.

Usage:

```ts
import { Controller, Middlewares } from 'wapidi';

@Controller('dog')
@Middlewares(EnsureAuthenticated)
export class DogController {
    @Inject(DogService) accessor dogService: DogService;

    @Post()
    @Middlewares(RequireRole('admin'))
    add(req: Request, res: Response) {
        this.dogService.add(req.body);
        res.sendStatus(201);
    }
}
```

`EnsureAuthenticated` will be applied to every endpoint this controller registers, while `RequireRole` will be only applied to `add()`.

`@Middleware()` takes an array of middlewares or a comma separated list of middlewares.

#### What is a middleware?

A middleware is of type `MiddlewareType`:

```ts
type MiddlewareType = Function | Middleware | MiddlewareFactory;
```

##### Function

Your traditional connect-type middleware. You can use any from npm or write your own:

```ts
import bodyParser from 'body-parser';

@Controller()
@Middlewares(bodyParser.json())
class AppController {
    @Get('test/:id')
    @Middlewares((req, res, next) => {
        if (req.params.id === '0') {
            next('route');
        } else {
            next();
        }
    })
    test(req, res) {
        res.json('test');
    }

    // ...
}
```

##### Middleware

Helper class to create a middleware which can be ignored on certain routes. Say you want to apply `bodyParser` on every route in `AppController` except one. You can use a `Middleware`:

```ts
import bodyParser from 'body-parser';
import { Middleware } from 'wapidi';

@Controller()
@Middlewares(new Middleware(bodyParser.json()).ignoreOn('test'))
class AppController {
    @Get('test/:id')
    test(req, res) {
        res.json(req.body);
    }

    @Get('ping')
    ping(req, res) {
        res.json(req.body);
    }
}
```

##### MiddlewareFactory

Same as `Middleware` but it takes a function which returns a function.

```ts
constructor(middlewareFactoryFunction: (route: TRoute) => Function)
```

Usage:

```ts
const ROLES = {
    user: 'user',
    admin: 'admin',
} as const;

const mockUser = {
    username: 'admin',
    password: 'Password1',
    roles: [ROLES.admin, ROLES.user],
};

type Route = BaseRoute & {
    requireRole: keyof typeof ROLES;
};

const verifyRole = new MiddlewareFactory<Route>(route => (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get('Authorization');
    if (!authHeader) return res.sendStatus(401);

    const [type, value] = authHeader.split(' ');
    if (type && type === 'Basic' && value != null) {
        const [username, password] = Buffer.from(value, 'base64').toString('utf8').split(':');
        if (
            username === mockUser.username &&
            password === mockUser.password &&
            mockUser.roles.includes(route.requireRole)
        ) {
            next();
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

const RequireRole = (role: keyof typeof ROLES) => createRouteDecorator<Route>(route => (route.requireRole = role));

@Controller()
class AppController {
    @Get('test/:id')
    @Middlewares((req, res, next) => {
        if (req.params.id === '0') {
            next('route');
        } else {
            next();
        }
    })
    test(req, res) {
        res.json('test');
    }

    @Get('test/:id')
    @RequireRole(ROLES.admin)
    @Middlewares(verifyRole)
    testBreakOut(req, res) {
        res.json('testBreakOut');
    }
}
```

#### Order of the middlewares

When we apply middlewares both on the controller and on an endpoint it's important to note the order on which they get applied/called.

```ts
@Controller()
@Middlewares([
    A, // 1
    B, // 2
])
class Ctrl {
    @Post()
    @Middlewares([
        C, // 3
        D, // 4
    ])
    method() {}
}
```

### createRouteDecorator()

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

### @Module()

You can collect controllers under a common module, and bind the module to `expressjs`. A module might have a path prefix and all controllers under the module inherit the prefix.

There is an example express app utilising modules => [examples/with-modules](examples/with-modules).

Usage:

```ts
import { Module } from 'wapidi';

@Module('api', {
    controllers: [CatController, DogController],
})
class ApiModule {}

app.use(bind(ApiModule));
```

You can use modules even without the server-api as [getRoutes()](#getroutes) works on a class decorated with `@Module()` as well.

```ts
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

const routes = getRoutes(ApiModule);

// routes:
// [
//   {
//     method: 'get',
//     path: ':id',
//     actionName: 'get',
//     preparedPath: '/api/cat/:id',
//     action: [Function: bound get]
//   },
//   {
//     method: 'get',
//     path: ':id',
//     actionName: 'get',
//     preparedPath: '/api/dog/:id',
//     action: [Function: bound get]
//   }
// ]
```

## Container API

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

### InjectionToken()

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

### register()

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

### setup()

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

### get()

Get a provider from the container in exchange for an injection token.

Usage:

```ts
import { container } from 'wapidi';

container.get<ConfigType>(CONFIG);
```

### spawn()

Spawns a new child container. A child container behaves similarly than the parent container except decorators will
register providers **only** on the global container and not on children.

Usage:

```ts
const childContainer = container.spawn();

childContainer.register(...);
childContainer.get(...);
// ...
```

### dispose()

Disposes the container and all of it's children.

## Server API

### bind()

Binds controller endpoints to an express instance. Similar to how one would bind an express Router instance to an express instance.

**Note**: unlike any other function, you have to import this from `wapidi/server`. This ensures that one can use `wapidi` without express. See the [Not using express?](#not-using-express) section.

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

## Route

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

When you create a route decorator | decorator factory you extend this route object with new properties. You can add new properties for the route object with [createRouteDecorator()](#createroutedecorator)

To ensure type correctness in `createRouteDecorator()` you can provide a generic type parameter which extends `BaseRoute`. That is, if your decorator factory would add a new route property _requiredRole_, then you should create a new type

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

## Examples

Please check the [examples](examples) folder for examples

## Not using express?

If you don't use `express` but still want to use `wapidi` you can install `wapidi` by omitting installing `express` as

```bash
npm install wapidi --omit=optional
```

Then, you loose the ability to use our express helpers from `wapidi/server`.

The `wapidi/server` module references express, so you can safely use `wapidi` without installing `express` if you won't reference `wapidi/server` in your codebase.

For example, the [examples/without-express](examples/without-express) example shows how one could use wapidi using vanilla node `http(s).createServer` utilisng the `getRoutes()` helper function.

This example **doesn't** have `express` installed as dependency.

### getRoutes()

If you don't want to use `express` you can still use the Decorator API and the Container API. In this case you might be still interested in the routes of the controllers/modules. For such cases you can use the `getRoutes()` helper function to access the generated routes.

Usage:

```ts
import { getRoutes } from 'wapidi';

const routes = getRoutes(Ctrl); // Ctrl is a class decorated with @Controller()

/// or

const routes = getRoutes(Module); // Module is a class decorated with @Module()
```
