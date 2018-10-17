// +========================================================================+ //
// | This file define testing utils for our app                             | //
// +========================================================================+ //

import { Entity } from 'pickled-cucumber/entities/types';
import { DB, ToDo, User } from './db';

const user: Entity<User, 'username'> = {
  create: async (attrs) => {
    const id = (attrs && attrs.username) || `${Math.random()}`;
    const item: User = {
      name: `${id}'s name`,
      username: id,
      ...attrs,
    };
    DB.users[id] = item;
    return item;
  },
  delete: async (idOrObject) => {
    const id = typeof idOrObject === 'string'
      ? idOrObject
      : idOrObject.username;
    delete DB.users[id];
  },
  findBy: async () => null,
  findById: async (idOrObject) => {
    const id = typeof idOrObject === 'string'
      ? idOrObject
      : idOrObject.username;
    return DB.users[id];
  },
  update: async (idOrObject, attrs) => {
    const id = typeof idOrObject === 'string'
      ? idOrObject
      : idOrObject.username;
    const item = {
      ...DB.users[id],
      ...attrs,
    };
    DB.users[id] = item;
    return item;
  },
};

const todo: Entity<ToDo, 'id'> = {
  create: async (attrs) => {
    const item: ToDo = {
      id: Math.random(),
      item: `${Math.random()} task`,
      owner: `${Math.random()}`,
      readOnly: false,
      ...(attrs || {}),
    };
    DB.todos[item.id] = item;
    return item;
  },
  delete: async (idOrObject) => {
    const id = typeof idOrObject === 'number'
      ? idOrObject
      : idOrObject.id;
    delete DB.todos[id];
  },
  findBy: async () => null,
  findById: async (idOrObject) => {
    const id = typeof idOrObject === 'number'
      ? idOrObject
      : idOrObject.id;
    return DB.todos[id];
  },
  update: async (idOrObject, attrs) => {
    const id = typeof idOrObject === 'number'
      ? idOrObject
      : idOrObject.id;
    const item = {
      ...DB.todos[id],
      ...attrs,
    };
    DB.todos[id] = item;
    return item;
  },
};

export const entities = {
  todo,
  user,
};
