import { Filter } from "./Filter";
import { OwnFields, RelationalFields, Type } from "./types";

export type SortType = "asc" | "desc";

type One2OneQuery<T> = Pick<Query<T>, "fields" | "include">;

export type Include<T> = {
  [key in keyof RelationalFields<T>]?:
    | true
    | (T[key] extends any[] ? Query<Exclude<Type<T, key>, number>> : One2OneQuery<Exclude<Type<T, key>, number>>);
};

export interface Query<T = {}> {
  fields?: (keyof OwnFields<T>)[];
  filter?: Filter<T>;
  include?: Include<T>;
  orderBy?: { [key in keyof OwnFields<T>]: SortType };
  page?: number;
  size?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Request<T = {}> extends Query<T> {
  // [key: string]: any;
}
