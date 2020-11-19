import { Enumerable, OwnFields, Type, RelationalFields, RelationType } from "./types";

export type Connector = "AND" | "OR" | "NOT";
export type BasicOperator = "equals" | "not" | "lt" | "lte" | "gt" | "gte" | "in" | "notIn";
export type StringOperator = "contains" | "startsWith" | "endsWith";
export type Operator = BasicOperator | StringOperator;

type BooleanFilter = {
  equals?: boolean;
};

type BasicFilter<U> = {
  equals?: U;
  not?: U;
  lt?: U;
  lte?: U;
  gt?: U;
  gte?: U;
  in?: U[];
  notIn?: U[];
};

type NumberFilter = BasicFilter<number>;
type StringFilter = BasicFilter<string> & {
  contains?: string;
  startsWith?: string;
  endsWith?: string;
};

type FieldFilter<T> = {
  [key in keyof OwnFields<T>]?:
    | Type<T, key>
    | (Type<T, key> extends boolean
        ? BooleanFilter
        : Type<T, key> extends string
        ? StringFilter
        : Type<T, key> extends number
        ? NumberFilter
        : BasicFilter<any>);
};

type One2ManyFilter<T> = Filter<T>;

type Many2ManyFilter<T> = {
  some?: Filter<T>;
  every?: Filter<T>;
  none?: Filter<T>;
};

type RelationFilter<T> = {
  [key in keyof RelationalFields<T>]?: T[key] extends any[]
    ? Many2ManyFilter<RelationType<T, key>>
    : One2ManyFilter<RelationType<T, key>>;
};

export type Filter<T> = FieldFilter<T> | RelationFilter<T> | { [key in Connector]?: Enumerable<Filter<T>> };
