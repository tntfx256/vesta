import * as fs from "fs-extra";
import * as path from "path";
import {Question} from "inquirer";
import {ClassGen} from "../core/ClassGen";
import {Vesta} from "../file/Vesta";
import {FieldGen as FieldGen, IFieldMeta} from "./FieldGen";
import {TsFileGen} from "../core/TSFileGen";
import {InterfaceGen} from "../core/InterfaceGen";
import {Log} from "../../util/Log";
import {IStructureProperty} from "../core/AbstractStructureGen";
import {Err, Field, FieldType, IModel, IModelFields, Schema} from "@vesta/core";
import {ArgParser} from "../../util/ArgParser";
import {camelCase, pascalCase} from "../../util/StringUtil";
import {mkdir, unixPath, writeFile} from "../../util/FsUtil";
import {ask} from "../../util/Util";
import {execSync} from "child_process";

export interface ModelGenConfig {
    name: string;
}

interface IFields {
    [name: string]: FieldGen
}

export class ModelGen {

    private modelFile: TsFileGen;
    private modelClass: ClassGen;
    private modelInterface: InterfaceGen;
    private path: string = 'src/cmn/models';
    private vesta: Vesta;
    private fields: IFields = {};
    private static modelStorage: Array<IModel> = [];
    private static isModelGenerated = false;
    private static modelsMeta: { [name: string]: IFieldMeta } = {};

    constructor(private config: ModelGenConfig) {
        this.vesta = Vesta.getInstance();
        const modelName = pascalCase(config.name);
        this.initModel(modelName);
    }

    private initModel(modelName) {
        modelName = pascalCase(modelName);
        this.modelFile = new TsFileGen(modelName);
        this.modelInterface = this.modelFile.addInterface(`I${this.modelFile.name}`);
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass('Model');
        this.modelClass.addImplements(this.modelInterface.name);
        this.modelFile.addImport('{Model, Schema, Database, FieldType}', '../../medium');

        let cm = this.modelClass.setConstructor();
        cm.addParameter({name: 'values', type: `I${modelName}`, isOptional: true});
        cm.addParameter({name: 'database', type: `Database`, isOptional: true});
        cm.setContent(`super(${modelName}.schema, database || ${modelName}.database);
        this.setValues(values);`);

        this.modelClass.addProperty({
            name: 'schema',
            type: 'Schema',
            access: ClassGen.Access.Public,
            defaultValue: `new Schema('${modelName}')`,
            isStatic: true
        });
        this.modelClass.addProperty({
            name: 'database',
            type: 'Database',
            access: ClassGen.Access.Public,
            isStatic: true
        });
        if (!this.vesta.isApiServer) {
            this.path = 'src/client/app/cmn/models';
        }
        mkdir(this.path);
    }

    private readField() {
        let question: Question = <Question>{
            name: 'fieldName',
            type: 'input',
            message: 'Field Name: '
        };
        ask<{ fieldName: string }>(question).then(answer => {
            if (!answer.fieldName) return this.write();
            let fieldName = camelCase(<string>answer.fieldName);
            let field = new FieldGen(this.modelFile, fieldName);
            this.fields[fieldName] = field;
            field.readFieldProperties()
                .then(() => {
                    Log.success('\n:: Press enter with empty fieldName when done\n');
                    this.readField();
                })
                .catch(err => Log.error(err.message));
        });
    }

    // todo import from existing database
    public generate() {
        this.readField();
    }

    private write() {
        let fieldNames = Object.keys(this.fields);
        // adding the id field
        if (fieldNames.indexOf('id') < 0) {
            let idField = new FieldGen(this.modelFile, 'id');
            idField.setAsPrimary();
            this.fields['id'] = idField;
            fieldNames.splice(0, 0, 'id');
        }
        for (let i = 0, il = fieldNames.length; i < il; ++i) {
            this.modelFile.addMixin(this.fields[fieldNames[i]].generate(), TsFileGen.CodeLocation.AfterClass);
            let {fieldName, fieldType, interfaceFieldType, defaultValue} = this.fields[fieldNames[i]].getNameTypePair();
            let property: IStructureProperty = {
                name: fieldName,
                type: fieldType,
                access: ClassGen.Access.Public,
                defaultValue: defaultValue,
            };
            this.modelClass.addProperty(property);
            let iProperty: IStructureProperty = <IStructureProperty>Object.assign({}, property, {
                isOptional: true,
                type: interfaceFieldType
            });
            this.modelInterface.addProperty(iProperty);
        }
        this.modelFile.addMixin(`${this.modelFile.name}.schema.freeze();`, TsFileGen.CodeLocation.AfterClass);
        writeFile(path.join(this.path, `${this.modelFile.name}.ts`), this.modelFile.generate());
    }

    static getModelsList(): any {
        let modelDirectory = path.join(process.cwd(), Vesta.getInstance().isApiServer ? 'src/cmn/models' : 'src/client/app/cmn/models');
        let models = {};
        try {
            let modelFiles = fs.readdirSync(modelDirectory);
            modelFiles.forEach(modelFile => {
                let status = fs.statSync(path.join(modelDirectory, modelFile));
                if (status.isFile()) {
                    models[modelFile.substr(0, modelFile.length - 3)] = path.join(modelDirectory, modelFile);
                } else {
                    let dir = modelFile;
                    let subModelDirectory = path.join(modelDirectory, modelFile);
                    let subModelFile = fs.readdirSync(subModelDirectory);
                    subModelFile.forEach(modelFile => {
                        models[dir + '/' + modelFile.substr(0, modelFile.length - 3)] = unixPath(path.join(subModelDirectory, modelFile));
                    })

                }
            });
        } catch (e) {
        }
        return models;
    }

    private static compileModelAndGetPath() {
        if (Vesta.getInstance().isApiServer) {
            return 'vesta/server/cmn/models/';
        }
        // running gulp model:ts to compile model files
        if (!ModelGen.isModelGenerated) {
            execSync(`node_modules/.bin/gulp model:ts`, {stdio: 'inherit'});
            ModelGen.isModelGenerated = true;
        }
        return 'vesta/tmp/cmn/model/models';
    }

    /**
     *
     * @param modelName this might also contains the path to the model
     * @returns {Model}
     */
    static getModel(modelName: string): IModel {
        let possiblePath = ModelGen.compileModelAndGetPath();
        if (ModelGen.modelStorage[modelName]) {
            return ModelGen.modelStorage[modelName];
        }
        let pathToModel = `${modelName}.js`;
        let className = ModelGen.extractModelName(pathToModel);
        let modelFile = path.join(process.cwd(), possiblePath, pathToModel);
        if (fs.existsSync(modelFile)) {
            let module = require(modelFile);
            if (module[className]) {
                // caching model
                ModelGen.modelStorage[modelName] = module[className];
                return module[className];
            }
        }
        Log.error(`${modelName} was not found. Please make sure your Gulp task is running!`);
        return null;
    }

    static getFieldsByType(modelName: string, fieldType: FieldType): IModelFields {
        let model = ModelGen.getModel(ModelGen.extractModelName(modelName));
        let fieldsOfType: IModelFields = null;
        if (!model) return fieldsOfType;
        let fields: IModelFields = (<Schema>model.schema).getFields();
        for (let names = Object.keys(fields), i = 0, il = names.length; i < il; ++i) {
            let field = fields[names[i]];
            if (field.properties.type == fieldType) {
                if (!fieldsOfType) {
                    fieldsOfType = {};
                }
                fieldsOfType[names[i]] = field;
            } else if (field.properties.type == FieldType.List && field.properties.list == fieldType) {
                fieldsOfType[names[i]] = field;
            }
        }
        return fieldsOfType;
    }

    static extractModelName(modelPath: string): string {
        return path.parse(modelPath).name;
    }

    static getUniqueFieldNameOfRelatedModel(field: Field): string {
        if (!field.properties.relation) throw new Err(Err.Code.WrongInput, `${field.fieldName} is not of type Relationship`);
        let targetFields = field.properties.relation.model.schema.getFields();
        let names = Object.keys(targetFields);
        let candidate = 'name';
        for (let i = names.length; i--;) {
            if (targetFields[names[i]].properties.type == FieldType.String) {
                if (targetFields[names[i]].properties.unique) return names[i];
                candidate = names[i];
            }
        }
        return candidate;
    }

    static getFieldMeta(modelName: string, fieldName: string): IFieldMeta {
        let key = `${modelName}-${fieldName}`;
        if (!ModelGen.modelsMeta[key]) {
            let tsModelFile = `src${Vesta.getInstance().isApiServer ? '' : '/client/app'}/cmn/models/${modelName}.ts`;
            const content = fs.readFileSync(tsModelFile, 'utf8');
            let regExp = new RegExp(`@${fieldName}\\(([^\\)]+)\\)`, 'i');
            const json = content.match(regExp);
            if (json) {
                try {
                    ModelGen.modelsMeta[key] = JSON.parse(json[1]);
                } catch (e) {
                    Log.error(`Error parsing model meta for '${modelName}'\n${json[1]}\n`);
                    ModelGen.modelsMeta[key] = {};
                }
            } else {
                ModelGen.modelsMeta[key] = {};
            }
        }
        return ModelGen.modelsMeta[key];
    }

    public static init(): ModelGenConfig {
        const argParser = ArgParser.getInstance();
        const config: ModelGenConfig = {
            name: argParser.get()
        };
        if (!config.name || !/^[a-z-]+/i.exec(config.name)) {
            Log.error('Missing/Invalid model name');
            return;
        }
        let model = new ModelGen(config);
        model.generate();
    }
}
