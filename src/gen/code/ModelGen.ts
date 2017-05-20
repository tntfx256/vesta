import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {Question} from "inquirer";
import {ClassGen} from "../core/ClassGen";
import {Vesta} from "../file/Vesta";
import {FieldGen as FieldGen} from "./FieldGen";
import {TsFileGen} from "../core/TSFileGen";
import {InterfaceGen} from "../core/InterfaceGen";
import {FsUtil} from "../../util/FsUtil";
import {Log} from "../../util/Log";
import {IStructureProperty} from "../core/AbstractStructureGen";
import {Util} from "../../util/Util";
import {StringUtil} from "../../util/StringUtil";
import {IModel, FieldType, IModelFields, Schema, Field, Err} from "@vesta/core";
let xml2json = require('xml-to-json');

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
    private xml: string;

    constructor(private args: Array<string>) {
        this.vesta = Vesta.getInstance();
        if (fs.existsSync(args[1])) {
            this.xml = args[1];
        } else {
            this.initModel(args[0]);
        }
    }

    private initModel(modelName) {
        modelName = StringUtil.fcUpper(_.camelCase(modelName));
        this.modelFile = new TsFileGen(modelName);
        this.modelInterface = this.modelFile.addInterface();
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass('Model');
        this.modelClass.addImplements(this.modelInterface.name);
        this.modelFile.addImport('{Model, Schema, Database, FieldType}', '../medium');

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
        FsUtil.mkdir(this.path);
    }

    private readField() {
        let question: Question = <Question>{
            name: 'fieldName',
            type: 'input',
            message: 'Field Name: '
        };
        Util.prompt<{ fieldName: string }>(question).then(answer => {
            if (!answer.fieldName) return this.write();
            let fieldName = _.camelCase(<string>answer.fieldName);
            let field = new FieldGen(this.modelFile, fieldName);
            this.fields[fieldName] = field;
            field.readFieldProperties()
                .then(() => {
                    Log.success('\n:: Press enter with empty fieldName when done\n');
                    this.readField();
                })
                .catch(err => Log.error(err.message));
        })
    }

    private readFields() {
        let idField = new FieldGen(this.modelFile, 'id');
        idField.setAsPrimary();
        this.fields['id'] = idField;
        let status = fs.lstatSync(this.xml);
        let steps = [];
        if (status.isDirectory()) {
            let files = fs.readdirSync(this.xml);
            for (let i = files.length; i--;) {
                steps.push(this.parseXml(this.xml + '\\' + files[i]));
            }
        } else if (status.isFile()) {
            steps.push(this.parseXml(this.xml));
        } else {
            Log.error('\n:: Invalid file path \n');
            process.exit(1);
        }
        Promise.all(steps).then(() => {
            console.log('writing models');
        }).catch(err => {
            console.log("error:" + JSON.stringify(err));
        })
    }

    private parseXml(xml) {
        return new Promise((resolve, reject) => {
            xml2json({input: xml}, (err, result) => {
                let parts = xml.split(/[\/\\]/);
                let modelName = parts[parts.length - 1].replace('.xml', '').replace('.XML', '');
                let model = new ModelGen([modelName]);
                if (err) return reject(result);
                let body = result['S:Envelope']['S:Body'];
                let schema = body[Object.keys(body)[0]]['return'][0];
                let fieldsName = Object.keys(schema);
                for (let i = fieldsName.length; i--;) {
                    let fieldName = _.camelCase(fieldsName[i]);
                    let type = 'string';
                    switch (fieldName) {
                        case 'id':
                            fieldName = 'refId';
                            break;
                        case 'active':
                            type = 'boolean';
                            break;
                    }
                    let field = new FieldGen(model.modelFile, fieldName);
                    field.addProperty('type', type);
                    model.fields[fieldName] = field;
                }
                let id = new FieldGen(model.modelFile, 'id');
                id.addProperty('type', 'integer');
                id.setAsPrimary();
                model.fields['id'] = id;
                model.write();
                resolve(result)
            });
        })
    }

    // todo import from existing database
    /*private importFromSQL() {
     let SQLConnection = new Connection(<config>{
     server: 'localhost',
     port: 1433,
     user: 'sa',
     password: '',
     database: 'TestDB',
     pool: {
     min: 5,
     max: 100,
     idleTimeoutMillis: 1000,
     }
     });
     SQLConnection.connect((err)=> {
     if (err) {
     return Promise.reject(new DatabaseError(Err.Code.DBConnection, err.message));
     }
     (new Request(SQLConnection)).query('SELECT * FROM INFORMATION_SCHEMA.COLUMNS', (err, result)=> {
     let schema = {};
     for (let i = 0; i < result.length; i++) {
     schema[result[i]['TABLE_NAME']] = schema[result[i]['TABLE_NAME']] || {};
     schema[result[i]['TABLE_NAME']][result[i]['COLUMN_NAME']] = result[i];
     }

     for (let modelName in schema) {
     if (schema.hasOwnProperty(modelName)) {
     let model = new ModelGen([modelName]);
     let id = new FieldGen(this.modelFile, 'id');
     id.addProperty('type', 'integer');
     id.setAsPrimary();
     model.fields['id'] = id;
     for (let fieldName in schema[modelName]) {
     if (schema[modelName].hasOwnProperty(fieldName)) {
     let record = schema[modelName][fieldName];
     let field = new FieldGen(this.modelFile, fieldName);
     if (record['COLUMN_DEFAULT']) {
     field.addProperty('default', record['COLUMN_DEFAULT']);
     }
     if (record['IS_NULLABLE'] == 'NO') {
     field.addProperty('required', true);
     }
     switch (record['DATA_TYPE']) {
     case 'decimal':
     field.addProperty('type', 'number');
     break;
     case 'bigint':
     case 'int':
     field.addProperty('type', 'integer');
     break;
     case 'bit':
     field.addProperty('type', 'boolean');
     break;
     case 'varbinary':
     field.addProperty('type', 'object');
     break;
     default:
     field.addProperty('type', 'string');
     break;
     }
     model.fields[fieldName] = field;
     }
     }
     model.write();
     }
     }
     })
     })
     }*/

    public generate() {
        // this.importFromSQL();
        if (this.xml) {
            this.readFields();
        } else {
            this.readField();
        }
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
            let iProperty: IStructureProperty = <IStructureProperty>_.assign({}, property, {
                isOptional: true,
                type: interfaceFieldType
            });
            this.modelInterface.addProperty(iProperty);
        }
        this.modelFile.addMixin(`${this.modelFile.name}.schema.freeze();`, TsFileGen.CodeLocation.AfterClass);
        FsUtil.writeFile(path.join(this.path, this.modelFile.name + '.ts'), this.modelFile.generate());
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
                        models[dir + '/' + modelFile.substr(0, modelFile.length - 3)] = FsUtil.unixPath(path.join(subModelDirectory, modelFile));
                    })

                }
            });
        } catch (e) {
        }
        return models;
    }

    /**
     *
     * @param modelName this might also contains the path to the model
     * @returns {Model}
     */
    static getModel(modelName: string): IModel {
        let possiblePath = ['vesta/server/cmn/models/', 'vesta/tmp/client/app/cmn/models/'];
        let pathToModel = `${modelName}.js`;
        let className = ModelGen.extractModelName(pathToModel);
        for (let i = possiblePath.length; i--;) {
            let modelFile = path.join(process.cwd(), possiblePath[i], pathToModel);
            if (fs.existsSync(modelFile)) {
                let module = require(modelFile);
                if (module[className]) {
                    return module[className];
                }
            }
        }
        console.error(`${modelName} was not found. Please make sure your Gulp task is running!`);
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
}
