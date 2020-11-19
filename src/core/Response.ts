export interface Response<T = Record<string, unknown>> {
  [key: string]: any;
  items?: T[];
  page?: number;
  size?: number;
  total?: number;
}

/*
export type SingleResponse<T> = T & {
  [key: string]: any;
};

export type ListResponse<T> = {
  [key: string]: any;
  items: T[];
  page?: number;
  size?: number;
  total?: number;
};

export type Response<T = Record<string, unknown>> = SingleResponse<T> | ListResponse<T>;
*/
