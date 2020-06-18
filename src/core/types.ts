import { Field } from "./Field";

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

export type Status = "INACTIVE" | "ACTIVE";

export enum MessageType {
  None,
  Error,
  Warning,
  Info,
  Success,
}

export enum LogLevel {
  None,
  Error,
  Warning,
  Info,
}

export type Enumerable<T> = T | T[];

export type PrimaryTypes = number | string | boolean | Date | File;

export type Type<T, K extends keyof T> = T[K] extends (infer R)[] ? R : T[K];

export type PickByType<T, U> = Pick<T, { [key in keyof T]: Type<T, key> extends U ? key : never }[keyof T]>;

export type OmitByType<T, U> = Pick<T, { [key in keyof T]: Type<T, key> extends U ? never : key }[keyof T]>;

export type OwnFields<T> = PickByType<T, PrimaryTypes>;

export type RelationalFields<T> = OmitByType<T, PrimaryTypes>;

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

export type DeepPartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
