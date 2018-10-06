Express Wrapper.
=============================

## Description

Express wrapper for handling async middlewares, order middlewares, schema validator, and other stuff.
Or just create your own fn that recieves all the middlewares, do some magic with them and pass it as a converter. (See Converter Docs)

## Installation

```sh
npm i --save async-app
```

## Usage ( Basic example)

```js

import { createApp, Opts } from 'async-app';

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
    throw new Error({ statusCode: 400, error: 'USER_NOT_FOUND' });
  }
	
  return { ...profile, password: undefined }; // JSON that will be sent to the client
};

app.get(
  '/user',
  'Returns user data',
  `This is a generic summary of the endpoint
  where u can specified all the things you want`,
  authenticated(), // Loaders/Permissions Middlewares
  req => getUserData(req.user), // Request handler (Returns JSON)
  200, // Default Response Status Code
);

```
