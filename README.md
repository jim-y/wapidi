# WAPIDI

A lightweight web api framework with depenedency injection for Typescript and express.js projects.

-   <a href="#installation">Installation</a>
-   <a href="#phylosophy">Phylosophy</a>
-   <a href="#api">API</a>
    -   <a href="#api.controller">Controller()</a>
    -   <a href="#api.bind">bind()</a>
    -   <a href="#api.injectable">Injectable</a>
    -   <a href="#api.inject">Inject()</a>
    -   <a href="#api.verbs">HTTP Verbs</a>
    -   <a href="#api.middlewares">Middlewares()</a>
    -   <a href="#api.create.middlewares">createRouteDecorator()</a>
-   <a href="#container">Dependency Injection</a>

<h2 id="installation">Installation</h2>

`npm install --save wapidi`

Wapidi relies on new typescript features like the stage 3 decorators introduced in typescript 5.0 and the decorator metadata feature introduced in version 5.2. This means you should at least be on version 5.2 of typescript.

`express` and `typescript` are peer-dependencies but other than these two there are no other deps so wapadi is extremely lightweight.

Enable these flags in your tsconfig.json file to support the decorator metadata feature as suggested by the typescript docs [https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#decorator-metadata)

```json
{
    "target": "ES2023",
    "module": "Node16",
    "lib": ["ES2023", "ESNext"],
    "strictPropertyInitialization": false
}
```

<h2 id="phylosophy">Phylosophy</h2>

This lightweight web api framework is opinionated but it helps managing your api routes with decorators and dependency injection.

It enforces using controllers for managing endpoints. The controllers might inject services, and services handle the business logic. Each endpoint is represented by a "hidden" meta object. You can decorate this meta object with decorators and consume the meta with middlewares.

In typescript there are 2 decorator implementations:

1. Experimental decorators [https://www.typescriptlang.org/docs/handbook/decorators.html#handbook-content](https://www.typescriptlang.org/docs/handbook/decorators.html#handbook-content)
2. ECMAScript decorators [https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators)

The former is available for a long time in typescript, and other DI implementations rely on them. However .. to leverage their full capabilities with metadata you are required to install the `reflect-metadata` package.

The latter implementation was "recently" (March 16th, 2023) added in Typescript 5.0 and it doesn't rely on the `reflect-metadata` package and it implements [https://github.com/tc39/proposal-decorators](https://github.com/tc39/proposal-decorators).

I think it's a safer bet to rely on the ECMAScript standard as it's more likely to be added to javascript later.

There are certain limitations though. Maybe the most important which you should be aware of, is that the stage: 3 proposal doesn't add support for class constructor parameter decorators. There is a stage: 1 proposal for it: [https://github.com/tc39/proposal-class-method-parameter-decorators](https://github.com/tc39/proposal-class-method-parameter-decorators).

This means, that in this package, by the limitations of the typescript implementation and the tc39 proposal, we do field injections, or even more precisely accessor field injections:

```ts
/// Instead of

class Ctrl {
    constructor(@Inject(DB) private db: Database) {}
}

/// we do

class Ctrl {
    @Inject(DB) private accessor db: Database;
}
```

### Example

CatController.ts

```ts
@Controller('cat')
class CatController {
    @Inject(CatService) accessor catService: CatService;

    @Get()
    async getAll(req: Request, res: Response) {
        res.json(await this.catService.getAllCats());
    }

    @Get(':name')
    async get(req: Request, res: Response) {
        res.json(await this.catService.getByName(req.params.name));
    }
}
```

CatService.ts

```ts
@Injectable
export class CatService {
    @Inject(DB) accessor db: Database;

    getAll() {
        // fetch cats from db
    }

    getByName(name: Cat['name']) {
        // fetch cat from db by name
    }
}
```

<h2 id="api">API</h2>

<h3 id="api.controller">Controller()</h3>

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
import { bind } from 'wapidi';
import { CatController } from './CatController';

const app = express();

app.use('/api', bind(CatController));
```

Then your endpoint is reachable

cat.http

```http
GET http://localhost:3000/api/v1/cat HTTP/1.1
```

<h3 id="api.bind">bind()</h3>

Binds controller endpoints to an express instance. Similar to how one would bind an express Router instance to an express instance.

Usage:

```ts
import express from 'express';
import { bind } from 'wapidi';
import { CatController } from './CatController';
import { DogController } from './DogController';

const app = express();

app.use('/api', bind(CatController));
app.use(bind(DogController));
```

<h3 id="api.injectable">Injectable</h3>

Class decorator. Marks a class as injectable by dependency injection.

Usage:

```ts
import { Injectable } from 'wapidi';

@Injectable
export class EchoService {
    echo() {
        return 'echo';
    }
}
```

Consuming the injectable can be done either by using the `Inject()` decorator in another injectable, or getting it from the ioc container.

```ts
/// either

@Injectable
class SomeClass {
    @Inject(EchoService) accessor echoService: EchoService;
}

/// or

async function EnsureAuthenticated(req, res, next) {
    const someHelper = container.get(SomeHelper);
    // ...
}
```

<h3 id="api.inject">Inject()</h3>

Class accessor field decorator factory. Injects a value from the IoC container to the field.

Usage:

```ts
@Injectable
class SomeClass {
    @Inject(EchoService) accessor echoService: EchoService;
}
```

<h3 id="api.verbs">HTTP Verbs</h3>

Decorates the controller endpoint's meta object with optional `path` prefix and `method` values as well as `action`. The host class must be decorated with `@Controller()`.

#### Get()

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

#### Post()

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

#### Put()

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

#### Patch()

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

#### Delete()

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

<h3 id="api.middlewares">Middlewares</h3>

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

`EnsureAuthenticated` will be applied to every endpoint this controller registers, while `RequireRole` will be only applied to endpoint defined by the `add()` function.

#### What is a middleware?

A middleware is a traditional express middleware, except, that you have to write middleware factories as the route meta object will be available for the middleware.

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

1. we can create a custom decorator factory to decorate the meta object with a require role
2. then write a middleware to validate the meta object (= route object) against the access token

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

Decorating the underlying `Route` object for an endpoint let's you extend your app's functionality. Middlewares can interact with the route object. For example, you can create a decorator factory to define the request schema then create a middleware which validates it. The schema validator middleware could be applied to the controller so that every endpoint can have schema validation if the route object contains a schema object.

<h2 id="container">Dependency Injection</h2>

### Container

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

### register()

Usage:

```ts
/// class
container.register({
    provide: UserService,
    useClass: UserService
});

/// singleton
container.register({
    provide: DBHelper,
    useSingleton: DBHelper,
});

/// factory
container.register({
    provide: Logger,
    useFactory: (container) => Logger,
});

/// value
const CONFIG = new InjectionToken('application config');
container.register({
    provide: CONFIG,
    useValue: { ... }
});
```

### setup()

### get()

Usage:

```ts
container.get(CONFIG);
```

<h2 id="route">Route</h2>

```ts
export type HTTPVerb = 'get' | 'post' | 'patch' | 'put' | 'delete';
export type BaseRoute = {
    method: HTTPVerb;
    path: string;
    action: string;
    middlewares: Function[];
};
```
