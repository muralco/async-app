import { Entities, Middleware } from '../types';

export type PermissionFn<TEntities> =
  (arg: TEntities) => boolean;

export type PermissionSpec<TEntities> =
  | PermissionFn<TEntities>
  | PermissionEntity<TEntities>
  | PermissionFn<TEntities> & PermissionEntity<TEntities>
  ;

export const isPermissionFn = <TEntities>(
  spec: PermissionSpec<TEntities>,
): spec is PermissionFn<TEntities> =>
  typeof spec === 'function';

export const isPermissionEntity = <TEntities>(
  spec: PermissionSpec<TEntities>,
): spec is PermissionEntity<TEntities> =>
  Object.keys(spec).length > 0;

export interface PermissionEntity<TEntities> {
  [key: string]: PermissionSpec<TEntities>;
}

export type PermissionMap<TEntities> = {
  [K in keyof TEntities]?: PermissionEntity<TEntities>;
};

export type Mapping<TEntities> = {
  [K in keyof TEntities]?: string;
};

export type CanFn<TEntities extends Entities> =
  (mapping?: Mapping<TEntities>) => Middleware<TEntities>;

export type CanItem<TEntities extends Entities> =
  CanFn<TEntities>
  & { [subaction: string]: CanFn<TEntities> }
  & { $container?: boolean };

export type CanAction<TEntities extends Entities> = {
  [K in keyof TEntities]: CanItem<TEntities>
};

export interface Can<TEntities extends Entities> {
  [action: string]: CanAction<TEntities>;
}
