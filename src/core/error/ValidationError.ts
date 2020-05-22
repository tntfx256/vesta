import { Err } from "../Err";
import { Violation } from "../types";

export class ValidationError<T = any> extends Err {
  constructor(public violations?: Violation<T>, message?: string) {
    super(Err.Type.Validation, message);
  }
}
