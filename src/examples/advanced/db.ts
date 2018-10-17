// +========================================================================+ //
// | This file represents our `data access layer`. In this example we are   | //
// | using an in-memory object instead of a real database.                  | //
// +========================================================================+ //

export interface User {
  username: string;
  name: string;
}

export interface ToDo {
  id: number;
  item: string;
  owner: string;
  readOnly: boolean;
}

interface Db {
  todos: { [id: number]: ToDo };
  users: { [username: string]: User };
}

export const DB: Db = {
  todos: {},
  users: {},
};

export const addUser = async (x: User) => {
  DB.users[x.username] = x;
};

export const addTodo = async (x: ToDo) => {
  DB.todos[x.id] = x;
};

export const getUser = async (username: string) =>
  DB.users[username];

export const getTodo = async (id: number) =>
  DB.todos[id];

export const getTodosForUser = async (username: string) =>
  Object.values(DB.todos).filter(t => t.owner === username);
