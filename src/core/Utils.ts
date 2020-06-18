import { DeepPartial } from "./types";

export const isObject = (item: any): boolean => item && typeof item === "object" && !Array.isArray(item);

export function merge<T = any>(partial: DeepPartial<T>, source: T): T {
  const keys = Object.keys(partial)
    .concat(Object.keys(source))
    .filter((v, i, me) => me.indexOf(v) === i);
  return keys.reduce((acc, key) => {
    if (isObject(partial[key])) {
      return { ...acc, [key]: merge(partial[key], source[key]) };
    }
    return { ...acc, [key]: key in partial ? partial[key] : source[key] };
    // tslint:disable-next-line: no-object-literal-type-assertion
  }, {} as T);
}
