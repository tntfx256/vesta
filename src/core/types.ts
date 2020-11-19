import {Field} from "./Field";

export type OptId<T> = Omit<T, "id"> & {id?: number};

// { minLength: "It should be longer", unique: "already exists" }
export type FieldValidationMessages<T = any> = {
  [rule in keyof Field<T> | string]?: string;
};

// { username: { minLength: "It should be longer", unique: "already exists" }, password: ... }
export type ValidationMessages<T = any> = {
  [field in keyof T]?: FieldValidationMessages<T>;
};

// { username: "It should be longer", password: "", ... }
export type ErrorMessages<T = any> = {
  [field in keyof T]?: string;
};

// { username: unique, password: minLength }
export type Violation<T = any> = {
  [field in keyof T]?: string;
};

export enum Status {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum MessageType {
  None = "None",
  Error = "Error",
  Warning = "Warning",
  Info = "Info",
  Success = "Success",
}

export enum LogLevel {
  None,
  Error,
  Warning,
  Info,
}

export type Enumerable<T> = T | T[];

export type PrimaryTypes = number | string | boolean | Date | File;

/**
 * @description this will extract the type of a field
 *
 * ```typescript
 * interface User {
 *   name: string;
 *   roles: Role[];
 * }
 *
 * // Type<User, "name">  --> string
 * // Type<User, "roles"> --> Role
 * ```
 */
export type Type<T, K extends keyof T> = T[K] extends (infer R)[] ? R : T[K];

/**
 * @description this will extract the name of a relational fields
 *
 * ```typescript
 * interface User {
 *   name: string;
 *   role: Role;
 *   posts: Post[];
 * }
 *
 * // RelationType<User> --> "role" | "posts"
 * ```
 */
export type RelationType<T, K extends keyof T> = Exclude<T[K] extends (infer R)[] ? R : T[K], number>;

/**
 * @description this will extract the name of fields which are of specific type
 *
 * ```typescript
 * interface User {
 *   firstName: string;
 *   lastName: string;
 *   role: Role;
 *   posts: Post[];
 * }
 *
 * // PickByType<User, string> --> "firstName" | "lastName"
 * // PickByType<User, Post>   --> "posts"
 * ```
 */
export type PickByType<T, U> = Pick<T, {[key in keyof T]: Type<T, key> extends U ? key : never}[keyof T]>;

export type OmitByType<T, U> = Pick<T, {[key in keyof T]: Type<T, key> extends U ? never : key}[keyof T]>;

export type OwnFields<T> = PickByType<T, PrimaryTypes>;

export type RelationalFields<T> = OmitByType<T, PrimaryTypes>;

/**
 * @description this will assert that the relation is of relationModelType and not number
 *
 * ```typescript
 * interface User {
 *   firstName: string;
 *   lastName: string;
 *   role: number | Role;
 *   posts: (number | Post)[];
 * }
 * ```
 * WithRelations<User> --> user.role is of Role
 *                     --> user.posts is of Post[]
 */
export type WithRelations<T> = T &
  {
    [key in keyof RelationalFields<T>]: T[key] extends (infer R)[] ? Exclude<R, number>[] : Exclude<T[key], number>;
  };

/**
 * @description this will assert that the relation is of relationModelType and not number
 *
 * ```typescript
 * interface User {
 *   firstName: string;
 *   lastName: string;
 *   role: number | Role;
 *   posts: (number | Post)[];
 * }
 *
 * WithRelation<User, "role">  --> user.role is of Role
 * WithRelation<User, "posts"> --> user.posts is of Post[]
 * ```
 */
export type WithRelation<T, K extends keyof RelationalFields<T>> = T &
  {
    [key in K]: T[key] extends (infer R)[] ? Exclude<R, number>[] : Exclude<T[key], number>;
  };

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export type DeepPartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

// utils related types
export interface Option<T = number | string | boolean> {
  value: T;
  title: string | number;
}

export type Translate = (key: string, ...params: any[]) => string;
