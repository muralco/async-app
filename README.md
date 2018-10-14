Async App
=========

## Description

`async-app` is an express wrapper for handling async middlewares, schema 
validation, and other stuff.

## Installation

```sh
npm i --save async-app
```

## Usage ( Basic example)

```ts
import {
  badRequest,
  createApp,
  Opts,
  errorMiddleware,
} from 'async-app';

interface User {
  email: string;
  name: string;
  password: string;
}

interface Entities extends BaseEntities {
  user: User;
}

const options: Opts = {
};

const app = createApp<Entities>(options);

// No more try/catch, async-app does it for you
const getUserData = async (user: User) => {
  const profile = await fetchProfile(user.email);
	
  if (!profile) {
    throw badRequest('USER_NOT_FOUND');
  }
	
  return { // JSON that will be sent to the client
    ...profile,
    password: undefined
  }; 
};

app.get(                             // Method
  '/user',                           // Path
  'Returns user data',               // Summary (optional)
  `You must be authenticated!`,      // Description (optional)
  authenticated(),                   // Middlewares
  req => getUserData(req.user),      // Request handler
  200,                               // Success status code (optional)
);

app.use(errorMiddleware); // To translate exceptions into HTTP error responses

```
