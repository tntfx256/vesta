import { Err, Field, FieldType, IModel, IModelFields, Schema, RelationType } from "@vesta/core";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { Question } from "inquirer";
import { join, parse } from "path";
import { ArgParser } from "../../util/ArgParser";
import { mkdir, unixPath, writeFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { camelCase, pascalCase } from "../../util/StringUtil";
import { ask } from "../../util/Util";
import { IStructureProperty } from "../core/AbstractStructureGen";
import { ClassGen } from "../core/ClassGen";
import { InterfaceGen } from "../core/InterfaceGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../file/Vesta";
import { FieldGen as IFieldGen, IFieldMeta } from "./FieldGen";

export interface IModelGenConfig {
    name: string;
}

interface IFields {
    [name: string]: IFieldGen;
}

export class ModelGen {

    public static getModelsList(): any {
        const modelPath = Vesta.getInstance().isApiServer ? "src/cmn/models" : "src/client/app/cmn/models";
        const modelDirectory = join(process.cwd(), modelPath);
        const models = {};
        try {
            const modelFiles = readdirSync(modelDirectory);
            modelFiles.forEach((modelFile) => {
                const status = statSync(join(modelDirectory, modelFile));
                if (status.isFile()) {
                    models[modelFile.substr(0, modelFile.length - 3)] = join(modelDirectory, modelFile);
                } else {
                    const dir = modelFile;
                    const subModelDirectory = join(modelDirectory, modelFile);
                    const subModelFile = readdirSync(subModelDirectory);
                    subModelFile.forEach((mFile) => {
                        const modelKey = `${dir}/${mFile.substr(0, mFile.length - 3)}`;
                        models[modelKey] = unixPath(join(subModelDirectory, mFile));
                    });

                }
            });
        } catch (e) {
            Log.warning(e.message);
        }
        return models;
    }

    public static getModel(modelName: string): IModel {
        // modelName this might also contains the path to the model
        const relativePath = ModelGen.compileModelAndGetPath();
        if (modelName in ModelGen.modelStorage) {
            return ModelGen.modelStorage[modelName];
        }
        const pathToModel = `${modelName}.js`;
        const className = ModelGen.extractModelName(pathToModel);
        const modelFile = join(process.cwd(), relativePath, pathToModel);
        if (existsSync(modelFile)) {
            const module = require(modelFile);
            if (module[className]) {
                // caching model
                ModelGen.modelStorage[modelName] = module[className];
                return module[className];
            }
        }
        Log.error(`${modelName} was not found at:\n ${modelFile}\nPlease make sure your Gulp task is running!`);
        // preventing display the same error message
        ModelGen.modelStorage[modelName] = null;
        return null;
    }

    public static getFieldsByType(modelName: string, fieldType: FieldType): IModelFields {
        const model = ModelGen.getModel(ModelGen.extractModelName(modelName));
        let fieldsOfType: IModelFields = null;
        if (!model) { return fieldsOfType; }
        const fields: IModelFields = (model.schema as Schema).getFields();
        for (let names = Object.keys(fields), i = 0, il = names.length; i < il; ++i) {
            const field = fields[names[i]];
            if (field.properties.type === fieldType) {
                if (!fieldsOfType) {
                    fieldsOfType = {};
                }
                fieldsOfType[names[i]] = field;
            } else if (field.properties.type === FieldType.List && field.properties.list === fieldType) {
                fieldsOfType[names[i]] = field;
            }
        }
        return fieldsOfType;
    }

    public static extractModelName(modelPath: string): string {
        return parse(modelPath).name;
    }

    public static getUniqueFieldNameOfRelatedModel(field: Field): string {
        if (!field.properties.relation) {
            throw new Err(Err.Code.WrongInput, `${field.fieldName} is not of type Relationship`);
        }
        const targetFields = field.properties.relation.model.schema.getFields();
        const names = Object.keys(targetFields);
        let candidate = "name";
        for (let i = names.length; i--;) {
            if (targetFields[names[i]].properties.type === FieldType.String) {
                if (targetFields[names[i]].properties.unique) { return names[i]; }
                candidate = names[i];
            }
        }
        return candidate;
    }

    public static getFieldForFormSelect(modelName: string) {
        const model = ModelGen.getModel(modelName);
        if (!model) { return null; }
        const fields = model.schema.getFields();
        if ("title" in fields) { return "title"; }
        for (let i = 0, fieldNames = Object.keys(fields), il = fieldNames.length; i < il; ++i) {
            const field = fields[fieldNames[i]];
            if (field.properties.type === FieldType.String) { return fieldNames[i]; }
        }
        return null;
    }

    public static getFieldMeta(modelName: string, fieldName: string): IFieldMeta {
        const key = `${modelName}-${fieldName}`;
        if (key in ModelGen.modelsMeta) {
            return ModelGen.modelsMeta[key];
        }
        const model = ModelGen.getModel(modelName);
        if (!model) {
            ModelGen.modelsMeta[key] = null;
            return null;
        }
        const field = model.schema.getField(fieldName);
        if (!field) {
            ModelGen.modelsMeta[key] = null;
            return null;
        }
        const tsModelFile = `src${Vesta.getInstance().isApiServer ? "" : "/client/app"}/cmn/models/${modelName}.ts`;
        const content = readFileSync(tsModelFile, "utf8");
        let meta: IFieldMeta = { form: true, list: true };
        const fieldStartIndex = content.indexOf(`schema.addField("${fieldName}")`);
        switch (field.properties.type) {
            case FieldType.Enum:
                const enumStartIndex = content.indexOf("enum(", fieldStartIndex) + 5;
                const enumEndIndex = content.indexOf(")", enumStartIndex);
                const options = content.substring(enumStartIndex, enumEndIndex).split(",")
                    .map((str) => str.replace(/\s+/g, ""));
                meta.enum = { options };
                // find enum path
                const enumName = options[0].split(".")[0];
                const enumImportRegex = new RegExp(`import.+${enumName}.+"([^"]+)";`);
                const enumImportResult = enumImportRegex.exec(content);
                if (enumImportResult) {
                    // todo check
                    meta.enum.path = enumImportResult[1];
                }
                break;
            case FieldType.Relation:
                meta.relation = { model: field.properties.relation.model.schema.name };
                // find path
                const relImportRegex = new RegExp(`import.+${meta.relation.model}.+"([^"]+)";`, "i");
                const relImportResult = relImportRegex.exec(content);
                if (relImportResult) {
                    const relPath = relImportResult[1].replace(meta.relation.model, "");
                    if (relPath !== "./") {
                        meta.relation.path = relPath;
                    }
                }
                break;
        }
        const regExp = new RegExp(`@${fieldName}\\(([^\\)]+)\\)`, "i");
        const json = content.match(regExp);
        if (json) {
            try {
                const parsedMeta: IFieldMeta = JSON.parse(json[1]);
                meta = Object.assign(meta, parsedMeta);
            } catch (e) {
                Log.error(`Error parsing model meta for '${modelName}'\n${json[1]}\n`);
                ModelGen.modelsMeta[key] = {};
            }
        }
        ModelGen.modelsMeta[key] = meta;
        return ModelGen.modelsMeta[key];
    }

    public static getConfidentialFields(modelName: string): string[] {
        const model = ModelGen.getModel(modelName);
        if (!model) { return []; }
        const confidentials = [];
        const fields = model.schema.getFields();
        const fieldsNames = Object.keys(fields);
        for (let i = fieldsNames.length; i--;) {
            const meta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldsNames[i]);
            if (meta.confidential) {
                confidentials.push(fieldsNames[i]);
            }
        }
        return confidentials;
    }

    public static getOwnerVerifiedFields(modelName: string): string[] {
        const model = ModelGen.getModel(modelName);
        if (!model) { return []; }
        const confidentials = [];
        const fields = model.schema.getFields();
        const fieldsNames = Object.keys(fields);
        for (let i = fieldsNames.length; i--;) {
            const meta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldsNames[i]);
            if (meta.verifyOwner) {
                confidentials.push(fieldsNames[i]);
            }
        }
        return confidentials;
    }

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

    private static isModelGenerated = false;
    private static modelsMeta: { [name: string]: IFieldMeta } = {};
    private static modelStorage: IModel[] = [];

    private static compileModelAndGetPath() {
        if (Vesta.getInstance().isApiServer) {
            return "vesta/server/cmn/models/";
        }
        // running gulp model:compile to compile model files
        if (!ModelGen.isModelGenerated) {
            execSync(`"node_modules/.bin/gulp" model:compile`, { stdio: "inherit" });
            ModelGen.isModelGenerated = true;
        }
        return "vesta/tmp/cmn/models";
    }

    private fields: IFields = {};
    private modelClass: ClassGen;
    private modelFile: TsFileGen;
    private modelInterface: InterfaceGen;
    private path: string = "src/cmn/models";
    private vesta: Vesta;

    constructor(private config: IModelGenConfig) {
        this.vesta = Vesta.getInstance();
        const modelName = pascalCase(config.name);
        this.initModel(modelName);
    }

    // todo import from existing database
    public generate() {
        this.readField();
    }

    private initModel(modelName) {
        modelName = pascalCase(modelName);
        this.modelFile = new TsFileGen(modelName);
        this.modelFile.addImport(["Model", "Schema", "Database", "FieldType"], "../../medium");
        this.modelInterface = this.modelFile.addInterface(`I${this.modelFile.name}`);
        this.modelInterface.shouldExport(true);
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass("Model");
        this.modelClass.shouldExport(true);
        this.modelClass.addImplements(this.modelInterface.name);

        const cm = this.modelClass.setConstructor();
        cm.addParameter({ name: "values", type: `I${modelName}`, isOptional: true });
        cm.addParameter({ name: "database", type: `Database`, isOptional: true });
        cm.setContent(`super(${modelName}.schema, database || ${modelName}.database);
        this.setValues(values);`);

        this.modelClass.addProperty({
            access: ClassGen.Access.Public,
            isStatic: true,
            name: "database",
            type: "Database",
        });
        this.modelClass.addProperty({
            access: ClassGen.Access.Public,
            defaultValue: `new Schema("${modelName}")`,
            isStatic: true,
            name: "schema",
            type: "Schema",
        });
        if (!this.vesta.isApiServer) {
            this.path = "src/client/app/cmn/models";
        }
        mkdir(this.path);
    }

    private readField() {
        const question: Question = {
            message: "Field Name: ",
            name: "fieldName",
            type: "input",
        } as Question;
        ask<{ fieldName: string }>(question).then((answer) => {
            if (!answer.fieldName) { return this.write(); }
            const fieldName = camelCase(answer.fieldName as string);
            const field = new IFieldGen(this.modelFile, fieldName);
            this.fields[fieldName] = field;
            field.readFieldProperties()
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
            // tslint:disable-next-line:max-line-length
            const { fieldName, fieldType, interfaceFieldType, defaultValue } = this.fields[fieldNames[i]].getNameTypePair();
            const property: IStructureProperty = {
                access: ClassGen.Access.Public,
                defaultValue,
                name: fieldName,
                type: fieldType,
            };
            this.modelClass.addProperty(property);
            const iProperty: IStructureProperty = Object.assign({}, property, {
                isOptional: true,
                type: interfaceFieldType,
            }) as IStructureProperty;
            this.modelInterface.addProperty(iProperty);
        }
        this.modelFile.addMixin(`${this.modelFile.name}.schema.freeze();`, TsFileGen.CodeLocation.AfterClass);
        writeFile(join(this.path, `${this.modelFile.name}.ts`), this.modelFile.generate());
    }
}
