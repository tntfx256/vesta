import { Field, FieldType, Mime, Schema } from "@vesta/core";
import { Question } from "inquirer";
import { Log } from "../util/Log";
import { getModelsList, getRelationModelName } from "../util/Model";
import { pascalCase } from "../util/StringUtil";
import { ask } from "../util/Util";
import { TsFileGen } from "./core/TSFileGen";

export interface IFieldMeta {
  confidential?: boolean;
  enum?: {
    name: string;
    options: string[];
    path?: string;
  };
  form?: boolean;
  list?: boolean;
  relation?: {
    model: string;
    path?: string;
    showAllOptions?: boolean;
  };
  verifyOwner?: boolean;
  wysiwyg?: boolean;
}

export class FieldGen {
  // private isMultilingual:boolean = false;
  public metaInfo: IFieldMeta = {};
  public field: Field = {} as Field;
  private enumName: string;

  constructor(public modelFile: TsFileGen, public name: string) {
    this.field.enum = [];
    this.field.fileType = [];
  }

  public addProperty(name, type) {
    this.field[name] = type;
  }

  public generate(): string {
    const meta: IFieldMeta = {};
    if ("form" in this.metaInfo) {
      meta.form = this.metaInfo.form;
    }
    if ("list" in this.metaInfo) {
      meta.list = this.metaInfo.list;
    }
    let code = `${this.name}: { type: ${this.getCodeForFieldType(this.field.type)}`;
    if (this.field.type === FieldType.List) {
      code += `,listOf: ${this.getCodeForFieldType(this.field.listOf)}`;
    }
    if (this.field.required) {
      code += ",required: true";
    }
    if (this.field.primary) {
      code += ",primary:true ";
    }
    if (this.field.unique) {
      code += ",unique: true";
    }
    if (this.field.minLength) {
      code += `,minLength: ${this.field.minLength}`;
    }
    if (this.field.maxLength) {
      code += `,maxLength: ${this.field.maxLength}`;
    }
    if (this.field.min) {
      code += `,min: ${this.field.min}`;
    }
    if (this.field.max) {
      code += `,max: ${this.field.max}`;
    }
    if (this.field.maxSize) {
      code += `,maxSize: "${this.field.maxSize.toUpperCase()}"`;
    }
    if (this.field.fileType.length) {
      code += `,fileType: ["${this.field.fileType.join('", "')}"]`;
    }
    if (this.field.enum.length) {
      code += this.genCodeForEnumField();
    }
    if ("default" in this.field) {
      code += this.getDefaultValueForSchemaCode();
    }
    if (this.field.isOneOf || this.field.areManyOf) {
      const modelName = getRelationModelName(this.field);
      this.modelFile.addImport([`I${modelName}`, modelName], `./${modelName}`);
      code += this.getRelationCode(modelName);
    }
    if (Object.keys(meta).length) {
      code = `// @${this.name}(${JSON.stringify(meta)})\n${code}`;
    }
    return code + "}";
  }

  public getDefaultValue(): string {
    const fieldType = this.getCodeForActualFieldType(this.field.type);
    let defValue = this.field.default;

    if (defValue !== undefined && this.field.type === FieldType.List) {
      defValue = `[${this.field.default}]`;
    }

    return defValue;
  }

  public async readFieldProperties(): Promise<void> {
    const question: Question = {
      choices: this.getFieldTypeChoices(),
      default: "String",
      message: "Field Type: ",
      name: "fieldType",
      type: "list",
    };
    const fieldTypeAnswer = await ask<{ fieldType: string }>(question);

    this.field.type = this.getFieldType(fieldTypeAnswer.fieldType);
    const questions = this.getQuestionsBasedOnFieldType(this.field.type, false);
    const answers = await ask<any>(questions);

    this.setPropertiesFromAnswers(answers);
    // if field is of type list, a new series of questions should be answered based on the items type
    if (this.field.listOf) {
      const listQuestions = this.getQuestionsBasedOnFieldType(this.field.listOf, true);
      const listAnswers = await ask(listQuestions);
      this.setPropertiesFromAnswers(listAnswers);
    }
  }

  public setAsPrimary() {
    this.field.primary = true;
    this.field.required = true;
  }

  private getFieldTypeChoices(isForList: boolean = false): string[] {
    return isForList
      ? [
          "String", // FieldType.String,
          "EMail", // FieldType.EMail,
          "Tel", // FieldType.Tel,
          "URL", // FieldType.URL,
          "Number", // FieldType.Number,
          "Integer", // FieldType.Integer,
          "Float", // FieldType.Float,
          "File", // FieldType.File,
          "Boolean", // FieldType.Boolean,
          "Object", // FieldType.Object,
          "Enum", // FieldType.Enum,
        ]
      : [
          "String", // FieldType.String,
          "EMail", // FieldType.EMail,
          "Password", // FieldType.Password,
          "Text", // FieldType.Text,
          "Tel", // FieldType.Tel,
          "URL", // FieldType.URL,
          "Number", // FieldType.Number,
          "Integer", // FieldType.Integer,
          "Float", // FieldType.Float,
          "Timestamp", // FieldType.Timestamp,
          "File", // FieldType.File,
          "Boolean", // FieldType.Boolean,
          "Object", // FieldType.Object,
          "Enum", // FieldType.Enum,
          "Relation", // FieldType.Relation,
          "List", // FieldType.List,
        ];
  }

  private getFieldType(name: string): FieldType {
    const map = {
      Boolean: FieldType.Boolean,
      EMail: FieldType.EMail,
      Enum: FieldType.Enum,
      File: FieldType.File,
      Float: FieldType.Float,
      Integer: FieldType.Integer,
      List: FieldType.List,
      Number: FieldType.Number,
      Object: FieldType.Object,
      Password: FieldType.Password,
      Relation: FieldType.Relation,
      String: FieldType.String,
      Tel: FieldType.Tel,
      Text: FieldType.Text,
      Timestamp: FieldType.Timestamp,
      URL: FieldType.URL,
    };
    return map[name] || 0;
  }

  private setPropertiesFromAnswers(answers: any) {
    for (let properties = Object.keys(answers), i = 0, il = properties.length; i < il; ++i) {
      const property = properties[i];
      if (["relatedModel"].includes(property)) {
        continue;
      }
      switch (property) {
        case "enum":
          this.field.enum = answers.enum
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          break;
        case "fileType":
          this.field.fileType = this.getFileTypes(answers.fileType);
          break;
        case "relationType":
          // this.field.relation = { type: answers.relationType, model: answers.relatedModel };
          class TempModel {
            public static schema = new Schema<any>(answers.relatedModel);
          }
          this.field[answers.relationType] = TempModel;
          break;
        case "list":
          this.field.listOf = this.getFieldType(answers.list);
          break;
        case "showInList":
          if (!answers.showInList) {
            this.metaInfo.list = false;
          }
          break;
        case "showInForm":
          if (!answers.showInForm) {
            this.metaInfo.form = false;
          }
          break;
        default:
          this.field[property] = answers[property];
      }
    }
  }

  private getFileTypes(answer: string): string[] {
    const arr = answer.split(",");
    const fileTypes = [];
    for (let i = arr.length; i--; ) {
      let meme = [];
      arr[i] = arr[i].trim();
      if (arr[i].indexOf("/") > 0) {
        if (Mime.isValid(arr[i])) {
          meme = [arr[i]];
        }
      } else {
        meme = Mime.getMime(arr[i]);
      }
      if (meme.length) {
        for (let j = meme.length; j--; ) {
          if (fileTypes.indexOf(meme[j]) < 0) {
            fileTypes.push(meme[j]);
          }
        }
      } else {
        Log.error(`Unknown type ${arr[i]}`);
      }
    }
    return fileTypes;
  }

  private getRelationCode(model: string): string {
    if (this.field.isOneOf) {
      return `,isOneOf: ${model}`;
    }
    if (this.field.areManyOf) {
      return `,areManyOf: ${model}`;
    }
  }

  private getQuestionsBasedOnFieldType(type: FieldType, isListItem: boolean): Question[] {
    let askForDefaultValue = false;
    const qs: Question[] = [];
    let askForListnForm = false;

    if (!isListItem) {
      qs.push({ name: "required", type: "confirm", message: "Is Required: ", default: false });
    }
    switch (type) {
      case FieldType.String:
        qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false });
        qs.push({ name: "minLength", type: "input", message: "Min Length: " });
        qs.push({ name: "maxLength", type: "input", message: "Max Length: " });
        // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
        askForListnForm = true;
        break;
      case FieldType.Text:
        // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
        break;
      case FieldType.Password:
        qs.push({ name: "minLength", type: "input", message: "Min Length: " });
        break;
      case FieldType.Tel:
        qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false });
        askForListnForm = true;
        break;
      case FieldType.EMail:
        qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false });
        askForListnForm = true;
        break;
      case FieldType.URL:
        askForListnForm = true;
        break;
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
        qs.push({ name: "min", type: "input", message: "Min Value: " });
        qs.push({ name: "max", type: "input", message: "Max Value: " });
        askForDefaultValue = true;
        askForListnForm = true;
        break;
      case FieldType.File:
        qs.push({ name: "maxSize", type: "input", message: "Max File Size: ", default: "1MB" });
        qs.push({ name: "fileType", type: "input", message: "Valid File Extensions: ", default: "jpg,png" });
        break;
      case FieldType.Boolean:
        askForDefaultValue = true;
        break;
      case FieldType.Object:
        break;
      case FieldType.Enum:
        // askForDefaultValue = true;
        qs.push({ name: "enum", type: "input", message: "Valid Options: " });
        askForListnForm = true;
        break;
      case FieldType.Relation:
        const types = ["isOneOf", "areManyOf"];
        const models = Object.keys(getModelsList());
        qs.push({ name: "relationType", type: "list", choices: types, message: "Relation Type: " });
        qs.push({ name: "relatedModel", type: "list", choices: models, message: "Target Model: " });
        break;
      case FieldType.List:
        qs.push({
          choices: this.getFieldTypeChoices(true),
          message: "Type of list items: ",
          name: "list",
          type: "list",
        });
        break;
    }
    if (askForDefaultValue) {
      qs.push({ name: "default", type: "input", message: "Default Value: " });
    }
    if (askForListnForm) {
      qs.push({ name: "showInList", type: "confirm", message: "Show in data table: ", default: true });
      qs.push({ name: "showInForm", type: "confirm", message: "Show in form: ", default: true });
    }
    return qs;
  }

  public getCodeForActualFieldType(type: FieldType): string {
    if (this.field.primary) {
      return "number";
    }
    switch (type) {
      case FieldType.String:
      case FieldType.Text:
      case FieldType.Password:
      case FieldType.Tel:
      case FieldType.EMail:
      case FieldType.URL:
        return "string";
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
      case FieldType.Timestamp:
        return "number";
      case FieldType.File:
        return "string | File";
      case FieldType.Boolean:
        return "boolean";
      case FieldType.Enum:
        return this.enumName;
      // case FieldType.RelationIndex:
      //   return "number";
      case FieldType.Relation:
        const types = `number | I${getRelationModelName(this.field)}`;
        if (this.field.areManyOf) {
          return `(${types})[]`;
        }
        return types;
      case FieldType.List:
        return `(${this.getCodeForActualFieldType(this.field.listOf)})[]`;
      case FieldType.Object:
        return "any";
    }
    return "any";
  }

  private getCodeForFieldType(type: FieldType): string {
    if (this.field.primary) {
      return "FieldType.Integer";
    }
    switch (type) {
      case FieldType.String:
        return "FieldType.String";
      case FieldType.Text:
        return "FieldType.Text";
      case FieldType.Password:
        return "FieldType.Password";
      case FieldType.Tel:
        return "FieldType.Tel";
      case FieldType.EMail:
        return "FieldType.EMail";
      case FieldType.URL:
        return "FieldType.URL";
      case FieldType.Number:
        return "FieldType.Number";
      case FieldType.Integer:
        return "FieldType.Integer";
      case FieldType.Float:
        return "FieldType.Float";
      case FieldType.File:
        return "FieldType.File";
      case FieldType.Timestamp:
        return "FieldType.Timestamp";
      case FieldType.Boolean:
        return "FieldType.Boolean";
      case FieldType.Object:
        return "FieldType.Object";
      case FieldType.Enum:
        return "FieldType.Enum";
      case FieldType.Relation:
        return "FieldType.Relation";
      case FieldType.List:
        return "FieldType.List";
    }
    return "FieldType.String";
  }

  private genCodeForEnumField(): string {
    let [firstEnum] = this.field.enum;
    if (firstEnum.indexOf(".") > 0) {
      this.enumName = firstEnum.substr(0, firstEnum.indexOf("."));
      this.field.default = firstEnum;
      Log.warning(`Do not forget to import the (${this.enumName})`);
    } else {
      this.enumName = pascalCase(this.modelFile.name) + pascalCase(this.name);
      const enumField = this.modelFile.addEnum(this.enumName);
      enumField.shouldExport(true);
      for (let i = 0, il = this.field.enum.length; i < il; ++i) {
        enumField.addEnum(this.field.enum[i]);
      }
      this.field.default = `${this.enumName}.${enumField.first}`;
    }
    return `,enum: Object.keys(${this.enumName})`;
  }

  private getDefaultValueForSchemaCode() {
    let value = this.field.default;
    switch (this.field.type) {
      case FieldType.String:
      case FieldType.Text:
      case FieldType.Password:
      case FieldType.Tel:
      case FieldType.EMail:
      case FieldType.URL:
        value = `"${value}"`;
        break;
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
        value = +value;
        break;
      case FieldType.List:
        value = `[${value}]`;
        break;
      // case FieldType.File:
      // case FieldType.Enum:
      // case FieldType.Object:
      // case FieldType.Timestamp:
      // case FieldType.Boolean:
      //   value = this.field.default;
    }
    return `,default: ${value}`;
  }
}
