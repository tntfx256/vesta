import { Status } from "../types";
import { IPermission } from "./Permission";

export interface IRole {
  name: string;
  permissions: (number | IPermission)[];
  status: Status;
}
