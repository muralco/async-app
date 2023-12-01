import { Entities, Middleware } from '../types';

// codes should be somewhat obtuse? just an int code we decypher?
// Thinking we'd actually do something like...
// 0000 = unknown/other
// 1XXX = permission
// 2XXX = entitlement
// ... additional categories by leading integer as needed
// Just thinking this could help us bucket things and have discreet codes as necessary?
export enum ReasonCodes {
  Other = '0000',
  Permission = '1000',
  Entitlement = '2000'
}

export type PermissionFn<TEntities> =
  (arg: TEntities) => { allowed: boolean, reason: ReasonCodes }

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
