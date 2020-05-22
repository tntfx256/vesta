export interface ErrType {
  errno?: number;
  code?: string;
}

export class Err implements Error, ErrType {
  public code: string;

  public errno: number;

  public message: string;

  public name: string;

  public method: string;

  public file: string;

  public static Type = {
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
    DBDuplicateEntry: { errno: 500, code: "ERR_DUPLICATE_ENTRY" },
    DBQuery: { errno: 500, code: "ERR_DB_QUERY" },
    DBInsert: { errno: 500, code: "ERR_DB_INSERT" },
    DBUpdate: { errno: 500, code: "ERR_DB_UPDATE" },
    DBDelete: { errno: 500, code: "ERR_DB_DELETE" },
    DBInvalidDriver: { errno: 500, code: "ERR_DB_DRIVER" },
    DBRecordCount: { errno: 500, code: "ERR_DB_RECORD_COUNT" },
    DBNoRecord: { errno: 500, code: "ERR_DB_RECORD_EMPTY" },
    DBRelation: { errno: 500, code: "ERR_DB_RELATION" },
    FileSystem: { errno: 500, code: "ERR_FILE" },
    Unknown: { errno: 500, code: "ERR_UNKNOWN" },
    Implementation: { errno: 501, code: "ERR_NOT_IMPLEMENTED" },
    NoConnection: { errno: 502, code: "ERR_BAD_GATEWAY" },
  };

  constructor(type: ErrType = Err.Type.Unknown, message?: string, method?: string, file?: string) {
    this.code = type.code;
    this.errno = type.errno;
    this.message = message || this.code;
    this.method = method || "";
    this.file = file || "";
    this.name = type.code;
  }
}
