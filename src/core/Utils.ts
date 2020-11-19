import {Field} from "./Field";
import {FieldType} from "./FieldType";
import {ModelConstructor} from "./Model";
import {
  DeepPartial,
  ErrorMessages,
  FieldValidationMessages,
  Option,
  Translate,
  ValidationMessages,
  Violation,
} from "./types";

export const isObject = (item: any): boolean => item && typeof item === "object" && !Array.isArray(item);

export function merge<T = any>(partial: DeepPartial<T>, source: T): T {
  const keys = Object.keys(partial)
    .concat(Object.keys(source))
    .filter((v, i, me) => me.indexOf(v) === i);
  return keys.reduce((acc, key) => {
    if (isObject(partial[key])) {
      return {...acc, [key]: merge(partial[key], source[key])};
    }
    return {...acc, [key]: key in partial ? partial[key] : source[key]};
    // tslint:disable-next-line: no-object-literal-type-assertion
  }, {} as T);
}

export function getFormOptions<T>(Model: ModelConstructor<T>, fieldName: Extract<keyof T, string>): Option[] {
  const field = Model.schema.getField(fieldName);

  switch (field.type) {
    case FieldType.Boolean:
      return [
        {value: true, title: "yes"},
        {value: false, title: "no"},
      ];
    case FieldType.Enum:
      return field.enum?.map((item) => ({value: item, title: `enum_${item.toLowerCase()}`})) || [];
    default:
      return [];
  }
}

export function getReadableOptions<T>(
  Model: ModelConstructor<T>,
  fieldName: Extract<keyof T, string>,
): {[option: string]: string} {
  const field = Model.schema.getField(fieldName);

  switch (field.type) {
    // not required
    // case FieldType.Boolean:
    //   return { 0: tr("no"), 1: tr("yes") };
    case FieldType.Enum:
      return field.enum?.reduce((acc, item) => ({...acc, [item]: `enum_${item.toLowerCase()}`}), {});
    default:
      return {};
  }
}

export function getFieldValidationMessages(field: Field, tr: Translate): FieldValidationMessages | null {
  if (field.name === "id") {
    return null;
  }

  const messages: FieldValidationMessages = {};

  if (field.areManyOf) {
    messages.areManyOf = tr("err_relation", field.areManyOf.schema.name);
  }
  if (field.assert) {
    messages.assert = tr("err_assert");
  }
  if (field.enum && field.enum.length) {
    messages.enum = tr("err_enum");
  }
  if (field.fileType && field.fileType.length) {
    messages.fileType = tr("err_file_type");
  }
  if (field.isOneOf) {
    messages.isOneOf = tr("err_relation", field.isOneOf.schema.name);
  }
  if (field.max) {
    messages.max = tr("err_max_value", field.max);
  }
  if (field.maxLength) {
    messages.maxLength = tr("err_max_length", field.maxLength);
  }
  if (field.maxSize) {
    messages.maxSize = tr("err_file_size", field.maxSize);
  }
  if (field.min) {
    messages.min = tr("err_min_value", field.min);
  }
  if (field.minLength) {
    messages.minLength = tr("err_min_length", field.minLength);
  }
  if (field.pattern) {
    messages.pattern = tr("err_pattern");
  }
  if (field.required) {
    messages.required = tr("err_required");
  }
  if (field.unique) {
    messages.unique = tr("err_unique", field.name);
  }
  // field.type
  switch (field.type) {
    case FieldType.Text:
      break;
    case FieldType.String:
      break;
    case FieldType.Password:
      break;
    case FieldType.Tel:
      messages.type = tr("err_phone");
      break;
    case FieldType.EMail:
      messages.type = tr("err_email");
      break;
    case FieldType.URL:
      messages.type = tr("err_url");
      break;
    case FieldType.Integer:
    case FieldType.Number:
    case FieldType.Float:
      messages.type = tr("err_number");
      break;
    case FieldType.File:
      break;
    case FieldType.Timestamp:
      messages.type = tr("err_date");
      break;
    case FieldType.Boolean:
      messages.type = tr("err_enum");
      break;

    // not needed
    // case FieldType.Enum:
    // case FieldType.Relation:

    // feauture
    // case FieldType.List:
    // case FieldType.Object:
  }
  return Object.keys(messages).length ? messages : null;
}

export function getValidationMessages<T>(model: ModelConstructor<T>, tr: Translate): ValidationMessages<T> {
  return model.schema.getFields().reduce(
    (messages, field) => ({
      ...messages,
      [field.name]: getFieldValidationMessages(field, tr),
    }),
    {},
  );
}

// This method filters the error messages specified by validationErrors
export function getErrorMessages<T = any>(
  messages: ValidationMessages<T>,
  validationErrors: Violation<T> | null,
): ErrorMessages<T> {
  const appliedMessages: ErrorMessages<T> = {};
  if (!validationErrors) {
    return appliedMessages;
  }
  for (let fieldNames = Object.keys(validationErrors), i = 0, il = fieldNames.length; i < il; ++i) {
    const fieldName = fieldNames[i];
    const failedRule = validationErrors[fieldName];
    appliedMessages[fieldName] = fieldName in messages ? messages[fieldName][failedRule] : null;
  }
  return appliedMessages;
}

export function extractClassNames(props: any, map: any): string {
  return [props.className || ""]
    .concat(
      Object.keys(map).map((key): string => {
        const value = props[key];
        if (key === "value") {
          return value || value === false || value === 0 ? map[key] : "";
        }
        return value ? map[key] : "";
      }),
    )
    .filter(Boolean)
    .join(" ");
}
