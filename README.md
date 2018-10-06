Express Wrapper.
=============================

## Description

Express wrapper for handling async middlewares, order middlewares, schema validator, and other stuff.
Or just create your own fn that recieves all the middlewares, do some magic with them and pass it as a converter. ( See Converter Docs )

## Installation

```sh
npm i --save async-app
```

## Usage

```js

import { createApp } from '../async-app';

interface User {
	email: string;
	name: string;
	password: string;
}

interface Entities extends BaseEntities {
	user: User;
}

const app = createApp<Entities>();

const getUserData = async (user: User) => {
	const profile = await fetchProfile(user.email);
	
	if (!profile) {
		throw new Error({ statusCode: 400, error: 'USER_NOT_FOUND' });
	}
	
	return { ...profile, password: undefined }; 🙈
};

app.get(
	'/user',
	'Returns user data',
	`This is a generic summary of the endpoint
	where u can specified all the things you want`,
	authenticated(), // Loaders
	req => getUserData(req.user), // Request handler
	200, // Default Response Status Code
);

```
