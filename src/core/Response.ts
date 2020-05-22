export interface Response<T = {}> {
  [key: string]: any;
  items?: T[];
  page?: number;
  size?: number;
  total?: number;
}
