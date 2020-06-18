import { Enumerable, OwnFields, Type } from "./types";

export type Connector = "AND" | "OR" | "NOT";
export type BasicOperator = "equals" | "not" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn";
export type StringOperator = "contains" | "startsWith" | "endsWith";
export type Operator = BasicOperator | StringOperator;

type BooleanFilter = {
  equals?: boolean | null;
};

type BasicFilter<U> = {
  equals?: U | null;
  not?: U | null;
  lt?: U | null;
  lte?: U | null;
  gt?: U | null;
  gte?: U | null;
  in?: U[] | null;
  notIn?: U[] | null;
};

type NumberFilter = BasicFilter<number>;
type StringFilter = BasicFilter<string> & {
  contains?: string | null;
  startsWith?: string | null;
  endsWith?: string | null;
};

type FieldFilter<T> = {
  [key in keyof OwnFields<T>]?: Type<T, key> extends boolean
    ? BooleanFilter
    : Type<T, key> extends string
    ? StringFilter
    : NumberFilter;
};

export type Filter<T> = FieldFilter<T> | { [key in Connector]?: Enumerable<Filter<T>> };
