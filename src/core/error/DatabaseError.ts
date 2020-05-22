import { Err, ErrType } from "../Err";

export class DatabaseError extends Err {
  constructor(code: ErrType, public dbError: Error) {
    super(code, dbError && dbError.message);
  }
}
