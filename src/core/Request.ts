import { Enumerable } from "./Utils";

/**
 * limit        number of records that should be fetched
 * offset       offset of starting record index (LIMIT fetchFrom, fetchLimit)
 * page         offset = (page - 1) * limit
 * fields       fieldNames that are suppose to be fetched
 * sort         sort results by fieldName and type of sorting (ORDER BY fieldName ASC | DESC)
 * relations    fieldNames (of type Relationship) that their related models should be fetched
 */
export type QueryOption<T = {}> = {
  size?: number;
  page?: number;
  fields?: Extract<keyof T, string>[];
  orderBy?: { [key in keyof T]: boolean };
  relations?: ({ [key in keyof T]: string[] } | keyof T)[];
};

export type Primaries = string | number | Date;

export type Filter<T extends Primaries> = {
  equals?: T | null;
  not?: T | Filter<T> | null;
  in?: T[] | null;
  notIn?: T[] | null;
  lt?: T | null;
  lte?: T | null;
  gt?: T | null;
  gte?: T | null;
};

export type StringFilter = Filter<string> & {
  contains?: string | null;
  startsWith?: string | null;
  endsWith?: string | null;
};

export type FieldFilter<T> = {
  [key in keyof T]?: T[key] extends string ? StringFilter : Filter<Primaries>;
};

export type ModelFilter<T = {}> = FieldFilter<T> & {
  AND?: Enumerable<FieldFilter<T>>;
  OR?: Enumerable<FieldFilter<T>>;
  NOT?: Enumerable<FieldFilter<T>>;
};

export type Request<T = {}> = QueryOption<T> & {
  query?: ModelFilter<T>;
};
