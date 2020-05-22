import { Question } from "inquirer";
import { camelCase } from "lodash";
import { join } from "path";
import { ArgParser } from "../util/ArgParser";
import { mkdir, writeFile } from "../util/FsUtil";
import { Log } from "../util/Log";
import { pascalCase } from "../util/StringUtil";
import { ask } from "../util/Util";
import { ClassGen } from "./core/ClassGen";
import { InterfaceGen } from "./core/InterfaceGen";
import { IStructureProperty } from "./core/StructureGen";
import { TsFileGen } from "./core/TSFileGen";
import { FieldGen as IFieldGen } from "./FieldGen";
import { Vesta } from "./Vesta";

export interface IModelGenConfig {
  name: string;
}

interface IFields {
  [name: string]: IFieldGen;
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

  constructor(private config: IModelGenConfig) {
    const modelName = pascalCase(config.name);
    this.initModel(modelName);
  }

  // todo import from existing database
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
        this.set(values);`);

    this.modelClass.addProperty({
      access: ClassGen.Access.Public,
      defaultValue: `new Schema<I${modelClassName}>("${modelClassName}")`,
      isStatic: true,
      name: "schema",
      readonly: true,
    });

    mkdir(this.path);
  }

  private readField() {
    const question: Question = {
      message: "Field Name: ",
      name: "fieldName",
      type: "input",
    } as Question;
    ask<{ fieldName: string }>(question).then((answer) => {
      if (!answer.fieldName) {
        return this.write();
      }
      const fieldName = camelCase(answer.fieldName as string);
      const field = new IFieldGen(this.modelFile, fieldName);
      this.fields[fieldName] = field;
      field
        .readFieldProperties()
        .then(() => {
          Log.success("\n:: Press enter with empty fieldName when done\n");
          this.readField();
        })
        .catch((err) => Log.error(err.message));
    });
  }

  private write() {
    const fieldNames = Object.keys(this.fields);
    // adding the id field
    if (fieldNames.indexOf("id") < 0) {
      const idField = new IFieldGen(this.modelFile, "id");
      idField.setAsPrimary();
      this.fields.id = idField;
      fieldNames.splice(0, 0, "id");
    }
    for (let i = 0, il = fieldNames.length; i < il; ++i) {
      this.modelFile.addMixin(this.fields[fieldNames[i]].generate(), TsFileGen.CodeLocation.AfterClass);
      const { fieldName, fieldType, interfaceFieldType, defaultValue } = this.fields[fieldNames[i]].getNameTypePair();
      const property: IStructureProperty = {
        access: ClassGen.Access.Public,
        defaultValue,
        name: fieldName,
        type: fieldType,
      };
      this.modelClass.addProperty(property);
      const iProperty: IStructureProperty = Object.assign({}, property, {
        isOptional: !this.fields[fieldNames[i]].field.required,
        type: interfaceFieldType,
      }) as IStructureProperty;
      this.modelInterface.addProperty(iProperty);
    }
    this.modelFile.addMixin(
      `${this.modelFile.name}.schema.freeze();

/*
Use the following pattern to add extra data for code generator. Check vesta documentation for more info.

// @fieldName({"confidenatial":true,"form":true,"list":true,"verifyOwner":true,"wysiwyg":true})
*/
`,
      TsFileGen.CodeLocation.AfterClass
    );

    writeFile(join(this.path, `${this.modelFile.name}.ts`), this.modelFile.generate());
  }
}
