import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {ClassGen} from "../core/ClassGen";
import {Vesta} from "../file/Vesta";
import {FieldGen as FieldGen} from "./FieldGen";
import {TsFileGen} from "../core/TSFileGen";
import {InterfaceGen} from "../core/InterfaceGen";
import {ProjectGen} from "../ProjectGen";
import {FsUtil} from "../../util/FsUtil";
import {Log} from "../../util/Log";
import {Model} from "vesta-schema/Model";
import {Connection, config, Request} from "mssql";
import {Err} from "vesta-util/Err";
import {DatabaseError} from "vesta-schema/error/DatabaseError";
import {IStructureProperty} from "../core/AbstractStructureGen";
import reject = Promise.reject;
var xml2json = require('xml-to-json');

interface IFields {
    [name:string]:FieldGen
}

export class ModelGen {

    private modelFile:TsFileGen;
    private modelClass:ClassGen;
    private modelInterface:InterfaceGen;
    private path:string = 'src/cmn/models';
    private vesta:Vesta;
    private fields:IFields = {};
    private xml:string;

    constructor(private args:Array<string>) {
        this.vesta = Vesta.getInstance();
        if (fs.existsSync(args[1])) {
            this.xml = args[1];
        } else {
            this.initModel(args[0]);
        }
    }

    private initModel(modelName) {
        modelName = _.capitalize(_.camelCase(modelName));
        this.modelFile = new TsFileGen(modelName);
        this.modelInterface = this.modelFile.addInterface();
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass('Model');
        this.modelClass.addImplements(this.modelInterface.name);
        this.modelFile.addImport('{Model}', 'vesta-schema/Model');
        this.modelFile.addImport('{Schema}', 'vesta-schema/Schema');
        this.modelFile.addImport('{FieldType}', 'vesta-schema/Field');
        this.modelFile.addImport('{Database}', 'vesta-schema/Database');

        var cm = this.modelClass.setConstructor();
        cm.addParameter({name: 'values', type: 'any', isOptional: true});
        cm.setContent(`super(${modelName}.schema, ${modelName}.database);
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
        if (this.vesta.getConfig().type == ProjectGen.Type.ClientSide) {
            this.path = 'src/app/cmn/models';
        }
        FsUtil.mkdir(this.path);
    }

    private getFields() {
        var question:Question = <Question>{
            name: 'fieldName',
            type: 'input',
            message: 'Field Name: '
        };
        Log.success('\n:: New field (press enter with no fieldName to exit)\n');
        var idField = new FieldGen(this.modelFile, 'id');
        idField.setAsPrimary();
        this.fields['id'] = idField;
        inquirer.prompt(question, answer => {
            if (answer['fieldName']) {
                var fieldName = _.camelCase(<string>answer['fieldName']);
                var field = new FieldGen(this.modelFile, fieldName);
                this.fields[fieldName] = field;
                field.getProperties(() => {
                    this.getFields();
                })
            } else {
                this.write();
            }
        })
    }

    private readFields() {
        var idField = new FieldGen(this.modelFile, 'id');
        idField.setAsPrimary();
        this.fields['id'] = idField;
        var status = fs.lstatSync(this.xml);
        var steps = [];
        if (status.isDirectory()) {
            var files = fs.readdirSync(this.xml);
            for (var i = files.length; i--;) {
                steps.push(this.parseXml(this.xml + '\\' + files[i]));
            }
        } else if (status.isFile()) {
            steps.push(this.parseXml(this.xml));
        } else {
            Log.error('\n:: Invalid file path \n');
            process.exit(1);
        }
        Promise.all(steps).then(()=> {
            console.log('writing models');
        }).catch(err=> {
            console.log("error:" + JSON.stringify(err));
        })
    }

    private parseXml(xml) {
        return new Promise((resolve, reject)=> {
            xml2json({input: xml}, (err, result)=> {
                var parts = xml.split(/[\/\\]/);
                var modelName = parts[parts.length - 1].replace('.xml', '').replace('.XML', '');
                var model = new ModelGen([modelName]);
                if (err) return reject(result);
                var body = result['S:Envelope']['S:Body'];
                var schema = body[Object.keys(body)[0]]['return'][0];
                var fieldsName = Object.keys(schema);
                for (var i = fieldsName.length; i--;) {
                    var fieldName = _.camelCase(fieldsName[i]);
                    var type = 'string';
                    switch (fieldName) {
                        case 'id':
                            fieldName = 'refId';
                            break;
                        case 'active':
                            type = 'boolean';
                            break;
                    }
                    var field = new FieldGen(model.modelFile, fieldName);
                    field.addProperty('type', type);
                    model.fields[fieldName] = field;
                }
                var id = new FieldGen(model.modelFile, 'id');
                id.addProperty('type', 'integer');
                id.setAsPrimary();
                model.fields['id'] = id;
                model.write();
                resolve(result)
            });
        })
    }

    // todo import from existing database
    private importFromSQL() {
        var SQLConnection = new Connection(<config>{
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
                return reject(new DatabaseError(Err.Code.DBConnection, err.message));
            }
            (new Request(SQLConnection)).query('SELECT * FROM INFORMATION_SCHEMA.COLUMNS', (err, result)=> {
                var schema = {};
                for (var i = 0; i < result.length; i++) {
                    schema[result[i]['TABLE_NAME']] = schema[result[i]['TABLE_NAME']] || {};
                    schema[result[i]['TABLE_NAME']][result[i]['COLUMN_NAME']] = result[i];
                }

                for (var modelName in schema) {
                    if (schema.hasOwnProperty(modelName)) {
                        var model = new ModelGen([modelName]);
                        var id = new FieldGen(this.modelFile, 'id');
                        id.addProperty('type', 'integer');
                        id.setAsPrimary();
                        model.fields['id'] = id;
                        for (var fieldName in schema[modelName]) {
                            if (schema[modelName].hasOwnProperty(fieldName)) {
                                var record = schema[modelName][fieldName];
                                var field = new FieldGen(this.modelFile, fieldName);
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
    }

    generate() {
        // this.importFromSQL();
        if (this.xml) {
            this.readFields();
        } else {
            this.getFields();
        }
    }

    private write() {
        var fieldNames = Object.keys(this.fields);
        for (var i = 0, il = fieldNames.length; i < il; ++i) {
            this.modelFile.addMixin(this.fields[fieldNames[i]].generate(), TsFileGen.CodeLocation.AfterClass);
            var {fieldName, fieldType, interfaceFieldType, defaultValue} = this.fields[fieldNames[i]].getNameTypePair();
            var property:IStructureProperty = {
                name: fieldName,
                type: fieldType,
                access: ClassGen.Access.Public,
                defaultValue: defaultValue,
            };
            this.modelClass.addProperty(property);
            var iProperty:IStructureProperty = <IStructureProperty>_.assign({}, property, {
                isOptional: true,
                type: interfaceFieldType
            });
            this.modelInterface.addProperty(iProperty);
        }
        this.modelFile.addMixin(`${this.modelFile.name}.schema.freeze();`, TsFileGen.CodeLocation.AfterClass);
        FsUtil.writeFile(path.join(this.path, this.modelFile.name + '.ts'), this.modelFile.generate());
    }

    static getModelsList():any {
        var vesta = Vesta.getInstance(),
            config = vesta.getConfig(),
            modelDirectory = path.join(process.cwd(), config.type == ProjectGen.Type.ServerSide ? 'src/cmn/models' : 'src/app/cmn/models'),
            models = {};
        try {
            var modelFiles = fs.readdirSync(modelDirectory);
            modelFiles.forEach(modelFile => {
                var status = fs.statSync(path.join(modelDirectory, modelFile));
                if (status.isFile()) {
                    models[modelFile.substr(0, modelFile.length - 3)] = path.join(modelDirectory, modelFile);
                } else {
                    var dir = modelFile;
                    var subModelDirectory = path.join(modelDirectory, modelFile);
                    var subModelFile = fs.readdirSync(subModelDirectory);
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
    static getModel(modelName:string):Model {
        var possiblePath = ['build/tmp/js/cmn/models/', 'www/app/cmn/models/', 'build/cmn/models/'],
            pathToModel = `${modelName}.js`;
        modelName = ModelGen.extractModelName(pathToModel);
        for (var i = possiblePath.length; i--;) {
            var modelFile = path.join(process.cwd(), possiblePath[i], pathToModel);
            if (fs.existsSync(modelFile)) {
                var module = require(modelFile);
                if (module[modelName]) {
                    return module[modelName];
                }
            }
        }
        return null;
    }

    public static extractModelName(modelPath:string):string {
        return path.parse(modelPath).name;
    }
}
