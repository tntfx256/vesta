import {Err, ErrorType} from "../Err";
import {Violation} from "../types";

export class ValidationError<T = any> extends Err {
  constructor(violations?: Violation<T>, message?: string) {
    super(ErrorType.Validation, message);
    this.violations = violations || null;
  }
}
