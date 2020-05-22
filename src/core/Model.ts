import { Schema } from "./Schema";
import { Violation } from "./types";
import { Validator } from "./Validator";

export interface ModelConstructor<T = any> {
  readonly schema: Schema<T>;
  new (values?: Partial<T>): Model<T>;
}

export abstract class Model<T = any> {
  constructor(public readonly schema: Schema<T>) {}

  public setValues(values: Partial<T>): void {
    if (!values) {
      return;
    }
    const fieldsNames = this.schema.getFieldsName();
    let fieldName;
    for (let i = fieldsNames.length; i--; ) {
      fieldName = fieldsNames[i];
      if (values[fieldName] !== undefined) {
        this[fieldName] = values[fieldName];
      }
    }
  }

  public getValues(...fields: (keyof T)[]): T {
    // tslint:disable-next-line: no-object-literal-type-assertion
    const values: T = {} as T;
    const validFieldNames = this.schema.getFieldsName();
    // checking if invalid field names has been passed as ...fields
    const fieldsNames = fields.length ? fields.filter((f) => validFieldNames.includes(f)) : validFieldNames;
    let fieldName;
    for (let i = fieldsNames.length; i--; ) {
      fieldName = fieldsNames[i];
      values[fieldName] = this[fieldName];
    }
    return values;
  }

  public toJSON(): T {
    return this.getValues();
  }

  public validate(...fieldNames: Extract<keyof T, string>[]): Violation<T> | null {
    const violations = Validator.validate<T>(this.getValues(...fieldNames), this.schema.getFields());
    if (!violations || !fieldNames.length) {
      return violations;
    }
    return fieldNames.reduce(
      (acc: Violation<T>, fieldName) => (violations[fieldName] ? { ...acc, [fieldName]: violations[fieldName] } : acc),
      null
    );
  }
}
