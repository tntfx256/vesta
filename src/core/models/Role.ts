import { Status } from "../types";
import { IPermission } from "./Permission";

// eslint-disable-next-line @typescript-eslint/interface-name-prefix
export interface IRole {
  name: string;
  permissions: (number | IPermission)[];
  status: Status;
}
