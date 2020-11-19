import { FieldType } from "@vesta/core";
import { Question } from "inquirer";
import { camelCase } from "lodash";
import { join } from "path";
import { ArgParser } from "../util/ArgParser";
import { mkdir, saveCodeToFile } from "../util/FsUtil";
import { Log } from "../util/Log";
import { pascalCase } from "../util/StringUtil";
import { ask } from "../util/Util";
import { ClassGen } from "./core/ClassGen";
import { InterfaceGen } from "./core/InterfaceGen";
import { IStructureProperty } from "./core/StructureGen";
import { TsFileGen } from "./core/TSFileGen";
import { FieldGen } from "./FieldGen";
import { Vesta } from "./Vesta";

export interface IModelGenConfig {
  name: string;
}

interface IFields {
  [name: string]: FieldGen;
}

export class ModelGen {
  public static init() {
    const argParser = ArgParser.getInstance();
    const config: IModelGenConfig = {
      name: argParser.get(),
    };
    if (!config.name || !/^[a-z-]+/i.exec(config.name)) {
      return Log.error("Missing/Invalid model name");
    }
    const model = new ModelGen(config);
    model.generate();
  }

  private fields: IFields = {};
  private modelClass: ClassGen;
  private modelFile: TsFileGen;
  private modelInterface: InterfaceGen;
  private path: string = Vesta.directories.model;

  constructor(config: IModelGenConfig) {
    const modelName = pascalCase(config.name);
    this.initModel(modelName);
  }

  public generate() {
    this.readField();
  }

  private initModel(modelName: string) {
    const modelClassName = pascalCase(modelName);
    this.modelFile = new TsFileGen(modelClassName);
    this.modelFile.addImport(["Model", "Schema", "FieldType"], "@vesta/core");
    this.modelInterface = this.modelFile.addInterface(`I${this.modelFile.name}`);
    this.modelInterface.shouldExport(true);
    this.modelClass = this.modelFile.addClass();
    this.modelClass.setParentClass(`Model<${this.modelInterface.name}>`);
    this.modelClass.shouldExport(true);
    this.modelClass.addImplements(this.modelInterface.name);

    const cm = this.modelClass.setConstructor();
    cm.addParameter({ name: "values", type: `Partial<I${modelClassName}>`, isOptional: true });
    cm.appendContent(`
        super(${modelClassName}.schema);
        this.setValues(values);`);

    this.modelClass.addProperty({
      access: ClassGen.Access.Public,
      defaultValue: `new Schema<I${modelClassName}>("${modelClassName}")`,
      isStatic: true,
      name: "schema",
      readonly: true,
    });

    mkdir(this.path);
  }

  private async readField() {
    const question: Question = {
      message: "Field Name: ",
      name: "fieldName",
      type: "input",
    };
    const answer = await ask<{ fieldName: string }>(question);
    if (!answer.fieldName) {
      return this.write();
    }
    if (answer.fieldName.toLocaleUpperCase() === "id") {
      Log.warning("\n:id is a reserved field name. It will be added by default\n");
      this.readField();
    }
    const fieldName = camelCase(answer.fieldName as string);
    const field = new FieldGen(this.modelFile, fieldName);
    this.fields[fieldName] = field;
    try {
      await field.readFieldProperties();
      // if (field.field.isOneOf) {
      //   // create another field
      //   const relField = new FieldGen(this.modelFile, `${fieldName}Id`);
      //   relField.addProperty("type", FieldType.RelationIndex);
      //   if (field.field.required) {
      //     relField.addProperty("required", true);
      //   }
      //   this.fields[relField.name] = relField;
      // }
      Log.success("\n:: Press enter with empty fieldName when done\n");
      this.readField();
    } catch (err) {
      Log.error(err.message);
    }
  }

  private write() {
    const fieldNames = Object.keys(this.fields)
      .filter((n) => n.toLowerCase() !== "id")
      .sort();
    // adding the id field
    const idField = new FieldGen(this.modelFile, "id");
    idField.setAsPrimary();
    this.fields.id = idField;
    fieldNames.unshift("id");
    const schemaCode: string[] = [];

    for (const fieldName of fieldNames) {
      const fieldGen = this.fields[fieldName];
      schemaCode.push(fieldGen.generate());
      // adding Interface & Class properties
      const defaultValue = fieldGen.getDefaultValue();
      const fieldType = fieldGen.getCodeForActualFieldType(fieldGen.field.type);
      const property: IStructureProperty = {
        access: ClassGen.Access.Public,
        defaultValue,
        isOptional: !fieldGen.field.required,
        name: fieldName,
        type: fieldType,
        sort: fieldName !== "id",
      };
      this.modelInterface.addProperty(property);
      this.modelClass.addProperty(property);
    }
    this.modelFile.addMixin(
      `
      ${this.modelFile.name}.schema.setFields({
        ${schemaCode.join(",\n")}
      });
      `,
      TsFileGen.CodeLocation.AfterClass
    );

    saveCodeToFile(join(this.path, `${this.modelFile.name}.ts`), this.modelFile.generate());
  }
}
