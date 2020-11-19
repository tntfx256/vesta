import { Field, ModelFields } from "./Field";

export class Schema<T = Record<string, unknown>> {
  private fields: Field<T>[] = [];

  constructor(private modelName: string) {}

  get name(): string {
    return this.modelName;
  }

  public getField(name: keyof T): Field<T> {
    for (let i = 0, il = this.fields.length; i < il; ++i) {
      if (this.fields[i].name === name) {
        return { ...this.fields[i] };
      }
    }
    return null;
  }

  public getFields(): Field<T>[] {
    return this.fields.map((f) => ({ ...f }));
  }

  public getFieldsName(): (keyof T)[] {
    return this.fields.map((f) => f.name);
  }

  public setFields(fields: { [key in keyof T]: Omit<Field<T>, "name"> }): void {
    this.fields = Object.keys(fields).map((field) => ({ name: field, ...fields[field] }));
  }

  public getValidationModel(): ModelFields<T> {
    // tslint:disable-next-line: no-object-literal-type-assertion
    return this.fields.reduce(
      (acc: ModelFields<T>, field: Field<T>) => ({ ...acc, [field.name]: { ...field } }),
      {} as ModelFields<T>
    );
  }
}
