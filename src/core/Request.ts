import { Filter } from "./Filter";
import { OwnFields, RelationalFields, Type } from "./types";

export type SortType = "asc" | "desc";

type SingleQuery<T> = Pick<Query<T>, "fields" | "include">;

export type Include<T> = {
  [key in keyof RelationalFields<T>]?:
    | true
    | (T[key] extends any[] ? Query<Exclude<Type<T, key>, number>> : SingleQuery<Exclude<Type<T, key>, number>>);
};

export interface Query<T = Record<string, unknown>> {
  fields?: (keyof OwnFields<T>)[];
  filter?: Filter<T>;
  include?: Include<T>;
  orderBy?: { [key in keyof OwnFields<T>]?: SortType };
  page?: number;
  size?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Request<T = Record<string, unknown>> extends Query<T> {
  // [key: string]: any;
}
