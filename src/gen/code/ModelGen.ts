import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {ClassGen} from "../core/ClassGen";
import {Vesta} from "../file/Vesta";
import {FieldGen as FieldGen} from "./FieldGen";
import {Util} from "../../util/Util";
import {Model} from "../../cmn/Model";
import {TsFileGen} from "../core/TSFileGen";
import {InterfaceGen} from "../core/InterfaceGen";
import {ProjectGen} from "../ProjectGen";
import {FsUtil} from "../../util/FsUtil";
import {Log} from "../../util/Log";

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

    constructor(private args:Array<string>) {
        this.vesta = Vesta.getInstance();
        var modelName = _.capitalize(_.camelCase(args[0]));
        this.modelFile = new TsFileGen(modelName);
        this.modelInterface = this.modelFile.addInterface();
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass('Model');
        this.modelClass.addImplements(this.modelInterface.name);
        this.modelFile.addImport('{Model}', '../Model');
        this.modelFile.addImport('{FieldType}', '../Field');
        this.modelFile.addImport('{Schema}', '../Schema');

        var cm = this.modelClass.setConstructor();
        cm.addParameter({name: 'values', type: 'any', isOptional: true});
        cm.setContent(`super(schema);
        this.setValues(values);`);

        this.modelFile.addMixin(`var schema = new Schema('${modelName}');`, TsFileGen.CodeLocation.AfterEnum);
        this.modelClass.addProperty({
            name: 'schema',
            type: 'Schema',
            access: ClassGen.Access.Public,
            defaultValue: 'schema',
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

    generate() {
        this.getFields();
    }

    private write() {
        var fieldNames = Object.keys(this.fields);
        for (var i = 0, il = fieldNames.length; i < il; ++i) {
            this.modelFile.addMixin(this.fields[fieldNames[i]].generate(), TsFileGen.CodeLocation.AfterEnum);
            var {fieldName, fieldType, interfaceFieldType, defaultValue} = this.fields[fieldNames[i]].getNameTypePair();
            var property = {
                name: fieldName,
                type: fieldType,
                access: ClassGen.Access.Public,
                defaultValue: defaultValue
            };
            this.modelClass.addProperty(property);
            property.type = interfaceFieldType;
            this.modelInterface.addProperty(property);
        }
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
                models[modelFile.substr(0, modelFile.length - 3)] = path.join(modelDirectory, modelFile);
            });
        } catch (e) {
        }
        return models;
    }

    static getModel(modelName:string):Model {
        var possiblePath = ['build/app/cmn/models/', 'www/app/cmn/models/', 'build/cmn/models/'];
        modelName = _.capitalize(modelName);
        for (var i = possiblePath.length; i--;) {
            var modelFile = path.join(process.cwd(), possiblePath[i], modelName + '.js');
            if (fs.existsSync(modelFile)) {
                var module = require(modelFile);
                if (module[modelName]) {
                    return module[modelName];
                }
            }
        }
        return null;
    }
}
