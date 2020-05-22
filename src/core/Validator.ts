import { Field, ValidatorFn } from "./Field";
import { FieldType } from "./FieldType";
import { Mime } from "./Mime";
import { Model } from "./Model";
import { isClient } from "./Platform";
import { Violation } from "./types";

export class Validator {
  public static regex = {
    email: /^([a-z0-9_.-]+)@([\da-z.-]+)\.([a-z.]{2,6})$/i,
    phone: /^[0-9+][0-9 \-()]{7,18}$/,
    url: /^(https?|ftp):\/\/(-\.)?([^\s/?.#-]+\.?)+(\/[^\s]*)?$/i,
  };

  public static validate<T = any>(values: Partial<T>, fields: Field<T>[]): Violation<T> {
    return fields.reduce((errors: Violation<T> | null, field: Field) => {
      const value = values[field.name];
      const hasValue = field.name in values && ![undefined, null, ""].includes(value);
      if (field.required || hasValue) {
        const result = Validator.validateField(field, values);
        if (result) {
          return { ...errors, [field.name]: result };
        }
      }
      return errors;
    }, null);
  }

  /**
   * Returns the name of the rule that has failed
   */
  public static validateField<T = any>(field: Field<T>, values: Partial<T>): keyof Field | null {
    const rules = Object.keys(field) as (keyof Field)[];
    // making sure that "required" is the first rule to be checked
    const index = rules.indexOf("required");
    if (index >= 0) {
      rules.splice(index, 1);
      rules.unshift("required");
    }

    for (let i = 0, il = rules.length; i < il; ++i) {
      const rule = rules[i];
      // check if validator exists, e.g. custome field props and ["default", "primary"]
      if (!(rule in Validator.ruleValidator)) {
        continue;
      }
      try {
        if (!Validator.ruleValidator[rule](field, values)) {
          return rule;
        }
      } catch (e) {
        return rule;
      }
    }
    return null;
  }

  public static addValidator<T = any>(name: string, validator: ValidatorFn<T>) {
    Validator.ruleValidator[name] = validator;
  }

  private static ruleValidator: { [key in keyof Field]: ValidatorFn } = {
    name: () => true,

    assert<T>(field: Field, values: Partial<T>): boolean {
      return field.assert(field, values);
    },

    enum<T>(field: Field, values: Partial<T>): boolean {
      return field.enum.includes(values[field.name]);
    },

    fileType<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      if (typeof value === "string") {
        return true;
      }
      if (!value || !value.name) {
        return false;
      }
      if (isClient()) {
        if (!(value instanceof File)) {
          return false;
        }
      }
      const part = value.name.split(".");
      let isExtensionValid = true;
      if (part.length) {
        isExtensionValid = false;
        const mime = Mime.getMime(part[part.length - 1]);
        for (let i = mime.length; i--; ) {
          if (field.fileType.includes(mime[i])) {
            isExtensionValid = true;
            break;
          }
        }
      }
      if (value.type === "application/octet-stream" || !value.type || !Mime.isValid(value.type)) {
        return isExtensionValid;
      }
      return isExtensionValid && field.fileType.includes(value.type);
    },

    max<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      return !isNaN(value) && value != null && value <= field.max;
    },

    maxLength<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      return typeof value === "string" ? value.length <= field.maxLength : true;
    },

    maxSize<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      if (typeof value === "string" || !value || !value.size) {
        return false;
      }
      if ("number" === typeof field.maxSize) {
        return value.size <= field.maxSize;
      }
      const result = /^(\d+)(KB|MB)$/i.exec(field.maxSize);
      if (!result) {
        return false;
      }
      const [, size, unit] = result;
      const sizeMap = { kb: 1024, mb: 1024 * 1024 };
      return value.size <= +size * sizeMap[unit.toLowerCase()];
    },

    min<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      return !isNaN(value) && value != null && value >= field.min;
    },

    minLength<T>(field: Field, values: Partial<T>): boolean {
      const value = values[field.name];
      return typeof value === "string" ? value.length >= field.minLength : true;
    },

    pattern<T>(field: Field, values: Partial<T>): boolean {
      return field.pattern.test(values[field.name]);
    },

    required<T>(field: Field, values: Partial<T>): boolean {
      if (!field.required) {
        return true;
      }
      const value = values[field.name];
      // checking if value exists
      if ([null, undefined, ""].includes(value)) {
        return false;
      }
      // checking list values
      if (field.areManyOf) {
        return value.length > 0;
      }
      return true;
    },

    type<T>(field: Field, values: Partial<T>): boolean {
      const type = FieldType[field.type];
      if (type in Validator.typeValidator) {
        return Validator.typeValidator[type](values[field.name]);
      }
      return true;
    },

    areManyOf<T, R>(field: Field, values: Partial<T>) {
      const value = values[field.name];
      // many2many
      for (let i = value.length; i--; ) {
        const thisValue = value[i];
        const valueType = typeof thisValue;
        if (valueType === "string" || valueType === "number") {
          continue;
        }
        if (valueType !== "object") {
          return false;
        }

        const instance: Model<R> = new field.areManyOf(thisValue as Partial<R>);
        // only validate fields with value
        if (instance.validate(...(Object.keys(thisValue) as Extract<keyof R, string>[]))) {
          return false;
        }
      }
      return true;
    },

    isOneOf<T, R>(field: Field, values: Partial<T>) {
      const value = values[field.name];
      // one2one | one2many
      const valueType = typeof value;
      if (valueType === "string" || valueType === "number") {
        return true;
      }
      if (valueType !== "object") {
        return false;
      }
      //
      const instance: Model<R> = new field.isOneOf(value as Partial<R>);
      return instance.validate(...(Object.keys(value) as Extract<keyof R, string>[])) === null;
    },
  };

  private static typeValidator: { [key in keyof typeof FieldType]?: any } = {
    Boolean(value: any): boolean {
      return value === true || value === false || value === 0 || value === 1;
    },

    Number(value: any): boolean {
      return !isNaN(value);
    },

    Float(value: any): boolean {
      return Validator.typeValidator.Number(value);
    },

    Integer(value: any): boolean {
      return Validator.typeValidator.Number(value) && Math.floor(value) === value;
    },

    EMail(value: string): boolean {
      return Validator.regex.email.test(value);
    },

    Tel(phoneNumber: any): boolean {
      return Validator.regex.phone.test(phoneNumber);
    },

    Timestamp(value: any): boolean {
      return Validator.typeValidator.Integer(value);
    },

    URL(url: any): boolean {
      return !!Validator.regex.url.exec(url);
    },
  };
}
