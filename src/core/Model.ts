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
    const fields = this.schema.getFieldsName();
    for (let i = fields.length; i--; ) {
      const fieldName = fields[i];
      if (values[fieldName] !== undefined) {
        this[String(fieldName)] = values[fieldName];
      }
    }
  }

  public getValues(): T;
  public getValues<K extends keyof T>(...fields: K[]): Pick<T, K>;
  public getValues<K extends keyof T>(...fields: K[]): T | Pick<T, K> {
    const allFields = this.schema.getFieldsName();
    return (fields && fields.length ? fields.filter((f) => allFields.includes(f)) : allFields).reduce(
      (values: any, field: keyof T) => {
        const value = this[String(field)];
        return value === undefined ? values : { ...values, [field]: value };
        // return { ...values, [field]: value };
      },
      {}
    );
  }

  public toJSON(): T {
    return this.getValues();
  }

  public validate(): Violation<T> | null;
  public validate<K extends keyof T>(...fields: K[]): Violation<Pick<T, K>> | null;
  public validate(...fields: (keyof T)[]): Violation<T> | null {
    const violations = Validator.validate<T>(this.getValues(...fields), this.schema.getFields());
    if (!violations || !fields.length) {
      return violations;
    }
    // removing violations for fields that are not mentioned in fields
    return fields.reduce(
      (acc: Violation<T>, fieldName) => (violations[fieldName] ? { ...acc, [fieldName]: violations[fieldName] } : acc),
      null
    );
  }
}
