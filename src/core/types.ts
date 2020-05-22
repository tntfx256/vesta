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
