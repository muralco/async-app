Async App
=========

`async-app` is an express wrapper for handling async middleware, schema 
validation, and other stuff.

## Installation

```sh
npm i --save async-app
```

Then replace your:
```js
const express = require('express');

const app = express();
```

With:
```js
const { createApp } = require('async-app');

const app = createApp();
```

And that's it, you are now using `async-app`. 

Read on to learn about all the cool things you can now do just by changing those
two lines.

## Anatomy of an `async-app` endpoint

```js
app.post(                                          // 1. method
  '/parties/:partyId/members',                     // 2. path
  'Invites a member to the party',                 // 3. summary
  `If no party exists with the given id then 404`, // 4. description
  { name: 'string' },                              // 5. schema
  load.user.fromClaims(),                          // \  6. loaders and
  load.party.fromParams(),                         //  |    permissions
  can.invite.party.member(),                       // /
  req => inviteToParty({                           // \
     party: req.party,                             //  | 7. request handler
     name: req.body.name,                          //  |
  }),                                              // /
  201,                                             // 8. success status
);
```

As you can gather from the example above `async-app` places a great deal of
emphasis on being declarative in your endpoint specs. Other than being
easier to read and understand, this declarative style has many advantages.
`async-app`'s _analyze_ module can be used to extract all this declarative
metadata from your API to do really cools stuff. But lets not get ahead of
ourselves.

As with regular _express_ the only mandatory values are `1. method`, `2. path`
and `7. request handler`. All other values, while recommended, are entirely
optional. Also note that the `7. request handler` can actually be composed of
more than one middleware.

Here's a summary of every part of an ideal declarative endpoint:
- The `1. method` and `2. path` are standard express values.
- `3. summary` and `4. description` allow you to document your endpoint and that
  information can later be used to automatically generate your API's
  documentation. See [Better endpoint documentation and
    metadata](#better-endpoint-documentation-and-metadata).
- `5. schema` can be used to validate the endpoint's input. See
  [Input validation](#input-validation).
- `6. loaders and permissions` are declarative middleware that load stuff into
  the request and validate permissions. In the example above we would load the
  _party_ into `req.party` from the `partyId` param and later check if the
  caller can invite someone to the party (i.e. `can.invite.party.member()`). See
  [Loaders and permissions](#loaders-and-permissions).
- `7. request handler` this is where the magic happens. Here is where you would
  write your business logic, but unlike regular _express_, you can use `async`
  functions and promises. See [Async middleware](#async-middleware).
- `8. success status` is the HTTP status code returned by `async-app` if you are
  using _async_ middleware and the middleware succeeds (i.e. does not throw an
  exception / rejects the promise). See [Async middleware](#async-middleware).

## Async middleware

Say you have this endpoint:

```js
app.get(
  '/users/:id',
  async (req, res) => {
    const user = await fetchUser(req.params.id);
    if (!user) {
      res.sendStatus(404);
      return;
    }
    res.json(user);
  },
);
```

In async app the same could be rewritten as:
```js
const { notFound } = require('async-app');

app.get(
  '/users/:id',
  async (req) => {
    const user = await fetchUser(req.params.id);
    if (!user) throw notFound('USER_NOT_FOUND', { id: req.params.id });
    return user;
  },
);

```

In a nutshell, if you have a middleware that only takes `req` and returns a
promise, `async-app` will take care of calling `next` for you.

If that middleware is the last in the endpoint spec, whatever the middleware
returns will be returned as JSON by the endpoint (i.e. `res.json`). The HTTP
status code by default will be `200`, but you can specify another success status
by placing a number as the last argument to the endpoint spec:

```js
app.post(
  '/users',
  req => createUser(req.body),
  201, // if everything goes well return an HTTP 201 Created
);
```

If a middleware throws an error (e.g. `notFound`, `badRequest`, etc.),
`async-app` will handle the error response. 
See [Error handling](#error-handling) for more details.

One nice perk of the refactor above that might not be evident at first sight is
that the endpoint handler only requires the `userId` to work, so we can move
that somewhere else and get better layer separation by not leaking express
stuff all over our business rules:

```js
const { notFound } = require('async-app');

// This is part of our "core" business logic and could be reused in other places
// (potentially in code that has nothing to do with express or APIs).
const getUserById = async (userId) => {
  const user = await fetchUser(userId);
  if (!user) throw notFound('USER_NOT_FOUND', { id: userId });
  return user;
};

// This endpoint is part of our API interface (i.e. service layer), we reuse
// "core" stuff here
app.get(
  '/users/:id',
  req => getUserBy(req.params.id),
);
```

## Better endpoint documentation and metadata

In `async-app` any string in the middleware stack will be discarded in runtime,
so we can actually document our endpoint's behavior in the endpoint itself:

```js
app.get(
  '/users/:id',
  'Returns the user identified by given id',
  'If no user exists with the given id, this endpoint returns a 404 status',
  req => getUserBy(req.params.id),
);
```

The interesting part about putting the information _inside_ the endpoint is that
`async-app` comes with a set of tools capable of reflecting on the endpoint
specification and generating metadata for the whole API:

```js
const analyze = require('async-app/analyze').default;

const routes = analyze(() => require('./app'));

// routes is an array of objects with the following shape:
// {
//   deprecated: 'in-use' | 'redirect' | 'rewrite',
//   description: string | undefined,
//   method: 'delete'|'get'|'patch'|'post'|'put',
//   path: string,
//   permissions: [string],
//   schema: Schema | undefined,
//   successStatus: number,
//   summary: string,
// }
```

- The first string after the `path`, if present, is the `summary`.
- The second string if present is the `description`.
- `deprecated` is a flag indicated the endpoint's deprecation status, if any.
  See [Deprecating endpoints](#deprecating-endpoints).
- `method` is the endpoint's HTTP method as in `app.post` has method `post`.
- `path` is the endpoint's path.
- `permissions` is a list of permissions required to call the endpoint. 
   See [Loaders and permissions](#loaders-and-permissions) for more details.
- `schema` is a specification of the endpoints input schema. See 
   [Input validation](#input-validation) for more details.
- `successStatus` is the HTTP status returned by this endpoint

A built-in usage for that metadata is to automatically generate swagger docs for
your API:

```js
const analyze = require('async-app/analyze').default;
const toSwagger = require('async-app/swagger').default;

const routes = analyze(() => require('./app'));
const { paths, tags } = toSwagger(routes);

const swagger = {
  basePath: '/',
  host: `localhost:${port}`,
  info: {
    title: 'Advanced example API',
    version: '1.0.0',
  },
  paths,
  schemes: 'http',
  swagger: '2.0',
  tags,
};
```

See a full example [here](/src/examples/advanced/generate-docs.ts).

## Input validation

`async-app` supports automatic validation of your endpoint's inputs by means of
a _schema_. `async-app` makes no assumptions of what you schema is, other than a
schema must be a JSON object.

Whenever you include a JSON object in your endpoint specification `async-app`
will process that object as the schema that defines the type of input your
endpoint expects.

To enable schema validation all you need to do is pass a `compileSchemaFn` key
to the `createApp` function (i.e. `async-app`'s constructor). That 
`compileSchemaFn` should take a schema object (whatever that might be) and
return a function that given an input returns a (potentially empty) list of
validation errors.

What schema validation library you use is up to you, but we recommend using
[mural-schema](https://github.com/muralco/mural-schema).

Here's how your would configure input validation in `async-app`:

```js
const { parseSchema } = require('mural-schema');

const app = createApp({ compileSchemaFn: parseSchema });
```

## Error handling

`async-app` provides a set of error functions you can throw from your
middleware and will be properly handled and returned to the caller.

The functions provided are:
```js
const {
  badRequest,
  forbidden,
  internalServerError,
  notFound,
  unauthorized,
} = require('async-app');
```

All error functions share the same signature:
```js
throw badRequest();
// => 400 {}

throw badRequest('some error');
// => 400 { "error": "some error" }

throw badRequest('some error', { extraData: 'something' });
// => 400 { "error": "some error", "extraData": "something" }
```

The first version returns a status code corresponding to the proper function 
(e.g. `badRequest` returns a `400`) and an empty JSON payload (i.e. `{}`).

The second version returns the same status as the first one but also sends an
`error` key in the response payload with the message supplied (e.g. 
`{ "error": "some error" }`).

The third version builds upon the previous version by interpolating the extra
information into the JSON returned (e.g. 
`{ "error": "some error", "extraData": "something" }`)

An extra `custom` function is also available that allows the definition of other
error messages:

```js
const { custom } = require('async-app');

throw custom(418, 'TEAPOT', { extraData: 'something' });
```

## Loaders and permissions

Loaders are declarative middleware to pull stuff into the `req` object. A
typical pattern in _express_ is that you have helper middleware that do nothing
with the `res` object and just mutate `req`.

The main problem with this pattern is that you end up with a Frankenstein `req`
filled with random keys and no certainty whatsoever.

`async-app`'s take on this pattern is to acknowledge the fact that we need to
pull stuff from external (often _async_) data sources into `req` to perform our
tasks, but at the same time to constrain the freedom (and chaos) provided by
_express_ into a manageable set of middleware.

Enter the _loaders_.

In `async-app` loaders are nothing other than middleware capable of loading
stuff into `req`. We recommend grouping loaders into a `load` object so that it
reads naturally. For example:

```js
app.get(
  '/parties/:partyId'
  load.party.fromParams(),
  req => req.party,
);
```

If you stick with the convention that `load.<entity>.from<somewhere>` always
loads `req.<entity>` the world will be a better place.

`async-app` provides several functions that can help you define _loaders_.

If you have a function like `getPartyById: (id: string) => Promise<Party>`
then `loadWith` is ideal for you:
```js
const { loadWith } = require('async-app');

// The first argument is a function that, given an `id`, returns a promise of 
// the thing to load (e.g. a party).
// The second argument is a function that, given a thing (e.g. a party), returns
// that thing's id.
const loadParty = loadWith(getPartyById, party => party.id);

const load = {
  party: {
    fromParams: (key = 'partyId', storeInto = 'party') =>
      loadParty(
        // The first argument is a function that, given a `req`, returns the 
        // id of the thing to load.
        req => req.params[key],
        // The second argument is the key in `req` where we'll store the thing.
        storeInto,
      ),
  }
};
```

If you need access to the full `req` in order to fetch the model you can use
`loadOnceWith`:
```js
const { loadOnceWith } = require('async-app');

// The argument is a function that, given a thing (e.g. a party), returns that
// thing's id.
const loadParty = loadOnceWith(party => party.id);

const load = {
  party: {
    fromParams: (key = 'partyId', storeInto = 'party') =>
      loadParty(
        // The first argument is a function that takes `req` and returns a
        // promise of the thing to load (e.g. a party).
        req => getPartyById(req.tenant, req.params[key]),
        // The second argument is a function that, given a `req`, returns the 
        // id of the thing to load.
        req => req.params[key],
        // The third argument is the key in `req` where we'll store the thing.
        storeInto,
      ),
  }
};
```

Just like _loaders_ are declarative middleware to load stuff into the `req`,
`async-app` comes equipped with another type of declarative middleware helper.

Enter _permissions_.

In `async-app` permissions are middleware that check if a request to the
endpoint can be performed. Permission middleware embody authorization in a
declarative way.

For example:
```js
app.get(
  '/parties/:partyId'
  load.user.fromClaims(), // <= assume we load `req.user` from a JWT or similar
  load.party.fromParams(),
  can.view.party(), // <= permission middleware
  req => req.party,
);
```

Just like _loaders_, `async-app` provides a way for you to define _permissions_:

```js
const { createPermissions } = require('async-app');

const can = createPermissions({
  party: {
    invite: {
      member: ({ party, user }) => party.hosts.includes(user.username),
    },
    view: ({ party, user }) => party.members.includes(user.username),
  },
});
```

The `createPermissions` function is a funny one. It takes an object like the one
above. The object's values are either permission functions or other objects
whose values are permission functions.

A permission function is a function that takes stuff from `req` (in that
example: `party` and `user`) and returns a `boolean`. If the function returns
`false`, `async-app` will send an HTTP 403 response to back to the caller,
otherwise, the endpoint execution will proceed as expected.

The _funny_ thing about `createPermissions` is that it will flip the names of
the keys in its argument to make it work in proper English. In the example
above, the `can` object will have two methods: `can.view.party()` and
`can.invite.party.member()`. Note: that `createPermissions` only supports at
most two levels of nesting in its argument.

## Deprecating endpoints

Sooner or later you'll find yourself facing the daunting task of deprecating API
endpoints. There is no standard way of doing this. You cannot just _delete_ the
endpoint (even though we all know you'd love to), so what can you do?

Fortunately, `async-app` provides the right tool for the task:

```js
const { deprecate } = require('async-app');

// Just mark the endpoint as deprecated but leave its implementation as-is
app.get(
  '/old-stuff',
  deprecate.endpoint,
  req => weShouldRemoveThisFunctionEventually(req),
);

// Or you could potentially give a different location for the call, without
// rewriting the request.
app.get(
  '/old-stuff',
  deprecate.for('/new-stuff'),
  req => weShouldRemoveThisFunctionEventually(req),
);

// Mark the endpoint as deprecated and rewrite the route so that a later
// (correct) route picks it up (e.g. `PATCH /parties/:id`)
app.put(  // oops, should've used PATCH 🤦
  '/parties/:partyId'
  deprecate.rewrite('PATCH', ({ params }) => `/parties/${params.partyId}`),
);

// Mark the endpoint as deprecated and redirect (302 by default) to the
// new endpoint. Note: this only works for `GET` endpoints. Also note that
// the second argument to `redirect` can be used to specify an alternative
// HTTP status.
app.get(
  '/party/:partyId' // oops, should've used plural 🤦
  deprecate.redirect(({ params }) => `/parties/${params.partyId}`, 301),
);
```

Do note that when using `deprecate.rewrite` the deprecated endpoints must be
defined _before_ the actual ones.

All `deprecate.*` middleware will append useful deprecation headers that your
clients can use to be aware of deprecation and upgrade the code on their side.

The deprecation response header for `deprecate.endpoint` is:
```
Deprecated: true
```

The deprecation response header for `for`, `redirect`, and `rewrite` is:
```
Deprecated-For: <method> <path>
```

As in:
```
> PUT /parties/1
...
< 200 OK
< Deprecated-For: PATCH /parties/1
...
```


## Usage examples

We include two usage examples of `async-app` in this repo. Both examples are in
Typescript but you could easily turn them into JS by removing all type
annotations (you can even use Typescript to do this for you).

The [basic example](/src/examples/basic/index.ts) shows most common scenarios.

The [advanced example](/src/examples/advanced) shows a full app with everything
`async-app` can offer, including input validation, loaders, permissions and
generated documentation.
