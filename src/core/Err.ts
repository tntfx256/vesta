import { Violation } from "./types";

export interface ErrType {
  errno: number;
  code: string;
}

export const ErrorType = {
  // CLIENT ERRORS
  Client: { errno: 400, code: "ERR_BAD_REQUEST" },
  Unauthorized: { errno: 401, code: "ERR_UNAUTHORIZED" },
  Token: { errno: 401, code: "ERR_TOKEN" },
  Forbidden: { errno: 403, code: "ERR_FORBIDDEN" },
  NotFound: { errno: 404, code: "ERR_NOT_FOUND" },
  NotAcceptable: { errno: 406, code: "ERR_NOT_ACCEPTABLE" },
  NotAllowed: { errno: 406, code: "ERR_NOT_ALLOWED" },
  Validation: { errno: 406, code: "ERR_VALIDATION" },
  // SERVER ERRORS
  Server: { errno: 500, code: "ERR_SERVER" },
  DBConnection: { errno: 500, code: "ERR_DB_CONNECTION" },
  Database: { errno: 500, code: "ERR_DB_OPERATION" },
  DuplicateEntry: { errno: 500, code: "ERR_DUPLICATE" },
  NoRecord: { errno: 500, code: "ERR_RECORD_NOT_FOUND" },
  FileSystem: { errno: 500, code: "ERR_FILE" },
  Unknown: { errno: 500, code: "ERR_UNKNOWN" },
  Implementation: { errno: 501, code: "ERR_NOT_IMPLEMENTED" },
  NoConnection: { errno: 502, code: "ERR_NO_CONNECTION" },
};

export class Err implements Error, ErrType {
  public code: string;

  public errno: number;

  public message: string;

  public name: string;

  public method: string;

  public file: string;

  public violations: Violation | null = null;

  constructor(type: ErrType = ErrorType.Unknown, message?: string, method?: string, file?: string) {
    this.code = type.code;
    this.errno = type.errno;
    this.message = message || this.code;
    this.method = method || "";
    this.file = file || "";
    this.name = type.code;
  }
}
