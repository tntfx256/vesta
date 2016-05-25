import * as inquirer from "inquirer";
import {Question} from "inquirer";
import * as _ from "lodash";
import {TsFileGen} from "../core/TSFileGen";
import {Vesta} from "../file/Vesta";
import {ModelGen} from "./ModelGen";
import {Log} from "../../util/Log";
import {IFieldProperties, FieldType, Relationship, FileMemeType} from "vesta-util";

export class FieldGen {
    private isMultilingual:boolean = false;
    private properties:IFieldProperties = <IFieldProperties>{};
    private enumName:string;

    constructor(private modelFile:TsFileGen, private name:string) {
        this.properties.enum = [];
        this.properties.fileType = [];
        var config = Vesta.getInstance().getConfig();
    }

    public getProperties(callback) {
        var question:Question = <Question>{
            name: 'fieldType',
            type: 'list',
            message: 'Field Type: ',
            default: FieldType.String,
            choices: [
                FieldType.String,
                FieldType.EMail,
                FieldType.Password,
                FieldType.Text,
                FieldType.Tel,
                FieldType.URL,
                new inquirer.Separator(),
                FieldType.Number,
                FieldType.Integer,
                FieldType.Float,
                new inquirer.Separator(),
                FieldType.Timestamp,
                FieldType.File,
                FieldType.Boolean,
                FieldType.Object,
                FieldType.Enum,
                new inquirer.Separator(),
                FieldType.Relation,
                new inquirer.Separator()
            ]
        };
        inquirer.prompt(question, fieldTypeAnswer => {
            this.properties.type = <string>fieldTypeAnswer['fieldType'];
            var questions = this.getRequiredPropertyQuestionsBasedOnFieldType();
            inquirer.prompt(questions, answers => {
                var properties = Object.keys(answers);
                for (var i = 0, il = properties.length; i < il; ++i) {
                    var property = properties[i];
                    if (['relatedModel'].indexOf(property) >= 0) continue;
                    if (property == 'enum') {
                        this.properties.enum = (<string>answers[property]).split(',').map(item=>_.trim(item));
                    } else if (property == 'fileType') {
                        this.properties.fileType = this.getFileTypes(answers['fileType']);
                    } else if (property == 'relationType') {
                        this.properties.relation = new Relationship(this.getRelationNumberFromCode(answers[property]));
                        this.properties.relation.relatedModel(answers['relatedModel']);
                    } else {
                        this.properties[property] = answers[property];
                    }
                }
                callback();
            });
        })
    }

    private getFileTypes(answer:string):Array<string> {
        let arr = answer.split(','),
            fileTypes = [];
        for (var i = arr.length; i--;) {
            var meme = [];
            arr[i] = _.trim(arr[i]);
            if (arr[i].indexOf('/') > 0) {
                if (FileMemeType.isValid(arr[i])) {
                    meme = [arr[i]];
                }
            } else {
                meme = FileMemeType.getMeme(arr[i]);
            }
            if (meme.length) {
                for (var j = meme.length; j--;) {
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

    private getRelationCodeFromNumber(type:number, model:string):string {
        switch (type) {
            case Relationship.Type.Many2Many:
                return `.areManyOf(${model})`;
            case Relationship.Type.One2One:
                return `.isPartOf(${model})`;
            default:
                return `.isOneOf(${model})`;
        }
    }

    private getRelationNumberFromCode(type:string):number {
        switch (type) {
            case 'One2One':
                return Relationship.Type.One2One;
            case 'Many2Many':
                return Relationship.Type.Many2Many;
        }
        return Relationship.Type.One2Many;
    }

    public setAsPrimary() {
        this.properties.primary = true;
    }

    private getRequiredPropertyQuestionsBasedOnFieldType():Array<Question> {
        var askForDefaultValue = false,
            qs:Array<Question> = [
                <Question>{name: 'required', type: 'confirm', message: 'Is Required: ', default: false}
            ];

        switch (this.properties.type) {
            case FieldType.String:
                qs.push(<Question>{name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false});
                qs.push(<Question>{name: 'minLength', type: 'input', message: 'Min Length: '});
                qs.push(<Question>{name: 'maxLength', type: 'input', message: 'Max Length: '});
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
                break;
            case FieldType.Text:
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
                break;
            case FieldType.Password:
                qs.push(<Question>{name: 'minLength', type: 'input', message: 'Min Length: '});
                break;
            case FieldType.Tel:
                qs.push(<Question>{name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false});
                break;
            case FieldType.EMail:
                qs.push(<Question>{name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false});
                break;
            case FieldType.URL:
                break;
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
                askForDefaultValue = true;
                qs.push(<Question>{name: 'min', type: 'input', message: 'Min Value: '});
                qs.push(<Question>{name: 'max', type: 'input', message: 'Max Value: '});
                break;
            case FieldType.File:
                qs.push(<Question>{name: 'maxSize', type: 'input', message: 'Max File Size (KB): '});
                qs.push(<Question>{name: 'fileType', type: 'input', message: 'Valid File Extensions: '});
                break;
            case FieldType.Boolean:
                askForDefaultValue = true;
                break;
            case FieldType.Object:
                break;
            case FieldType.Enum:
                // askForDefaultValue = true;
                qs.push(<Question>{name: 'enum', type: 'input', message: 'Valid Options: '});
                break;
            case FieldType.Relation:
                let types = ['One2One', 'One2Many', 'Many2Many'];
                let models = Object.keys(ModelGen.getModelsList());
                qs.push(<Question>{name: 'relationType', type: 'list', choices: types, message: 'Relation Type: '});
                qs.push(<Question>{name: 'relatedModel', type: 'list', choices: models, message: 'Target Model: '});
                break;
        }
        if (askForDefaultValue) {
            qs.push(<Question>{name: 'default', type: 'input', message: 'Default Value: '});
        }
        return qs;
    }

    private getCodeForActualFieldType():string {
        switch (this.properties.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                return 'string';
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
            //case FieldType.Date:
            //case FieldType.DateTime:
            case FieldType.Timestamp:
                return 'number';
            case FieldType.File:
                return 'File|string';
            case FieldType.Boolean:
                return 'boolean';
            case FieldType.Relation:
                let types = `number|I${this.properties.relation.model}|${this.properties.relation.model}`;
                if (this.properties.relation.type == Relationship.Type.Many2Many) {
                    return `Array<${types}>`;
                }
                return types;
            //case FieldType.Object:
            //case FieldType.Enum:
            //    return 'any';
        }
        if (this.properties.primary) return 'number|string';
        return 'any';
    }

    private getCodeForFieldType():string {
        if (this.properties.primary) return 'FieldType.Integer';
        switch (this.properties.type) {
            case FieldType.String:
                return 'FieldType.String';
            case FieldType.Text:
                return 'FieldType.Text';
            case FieldType.Password:
                return 'FieldType.Password';
            case FieldType.Tel:
                return 'FieldType.Tel';
            case FieldType.EMail:
                return 'FieldType.EMail';
            case FieldType.URL:
                return 'FieldType.URL';
            case FieldType.Number:
                return 'FieldType.Number';
            case FieldType.Integer:
                return 'FieldType.Integer';
            case FieldType.Float:
                return 'FieldType.Float';
            case FieldType.File:
                return 'FieldType.File';
            //case FieldType.Date:
            //    return 'FieldType.Date';
            //case FieldType.DateTime:
            //    return 'FieldType.DateTime';
            case FieldType.Timestamp:
                return 'FieldType.Timestamp';
            case FieldType.Boolean:
                return 'FieldType.Boolean';
            case FieldType.Object:
                return 'FieldType.Object';
            case FieldType.Enum:
                return 'FieldType.Enum';
            case FieldType.Relation:
                return 'FieldType.Relation';
        }
        return 'FieldType.String';
    }

    public generate():string {
        var code = `schema.addField('${this.name}').type(${this.getCodeForFieldType()})`;
        if (this.properties.required) code += '.required()';
        if (this.properties.primary) code += '.primary()';
        if (this.properties.unique) code += '.unique()';
        if (this.properties.minLength) code += `.minLength(${this.properties.minLength})`;
        if (this.properties.maxLength) code += `.maxLength(${this.properties.maxLength})`;
        if (this.properties.min) code += `.min(${this.properties.min})`;
        if (this.properties.max) code += `.max(${this.properties.max})`;
        if (this.properties.maxSize) code += `.maxSize(${this.properties.maxSize})`;
        if (this.properties.fileType.length) code += `.fileType('${this.properties.fileType.join("', '")}')`;
        if (this.properties.enum.length) code += this.genCodeForEnumField();
        if (this.properties.default) code += this.getDefaultValueCode();
        if (this.properties.relation) {
            let {type, model} = this.properties.relation;
            this.modelFile.addImport(`{I${model}, ${model}}`, `./${model.toString()}`);
            code += this.getRelationCodeFromNumber(type, model.toString());
        }
        return code + ';';
    }

    private getDefaultValueCode() {
        var value = this.properties.default;
        switch (this.properties.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                value = `'${this.properties.default}'`;
                break;
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
                value = +this.properties.default;
                break;
            // case FieldType.File:
            // case FieldType.Enum:
            // case FieldType.Object:
            // case FieldType.Timestamp:
            // case FieldType.Boolean:
            //     value = this.properties.default;
        }
        return `.default(${value})`;
    }

    private genCodeForEnumField():string {
        var enumArray = [],
            firstEnum:string = this.properties.enum[0];
        if (firstEnum.indexOf('.') > 0) {
            this.enumName = firstEnum.substr(0, firstEnum.indexOf('.'));
            enumArray = this.properties.enum;
            Log.warning(`Do not forget to import the (${this.enumName})`);
        } else {
            this.enumName = _.capitalize(this.modelFile.name) + _.capitalize(this.name);
            var enumField = this.modelFile.addEnum(this.enumName);
            enumField.shouldExport(true);
            firstEnum = `${this.enumName}.${firstEnum}`;
            for (var i = 0, il = this.properties.enum.length; i < il; ++i) {
                enumField.addProperty(this.properties.enum[i]);
                var v = _.capitalize(this.properties.enum[i]);
                enumArray.push(`${this.enumName}.${v}`);
                if (i == 0) {
                    firstEnum = enumArray[0];
                }
            }
        }
        this.properties.default = enumArray[0];
        return `.enum(${enumArray.join(", ")})`;
    }

    public getNameTypePair():{fieldName:string, fieldType:string, interfaceFieldType:string, defaultValue:string} {
        return {
            fieldName: this.name,
            fieldType: (this.properties.type == FieldType.Enum ? this.enumName : this.getCodeForActualFieldType()),
            interfaceFieldType: (this.properties.type == FieldType.Enum ? 'number' : this.getCodeForActualFieldType()),
            defaultValue: this.getCodeForDefaultFieldValue()
        }
    }

    private getCodeForDefaultFieldValue():string {
        switch (this.properties.type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
            case FieldType.File:
            case FieldType.Enum:
            case FieldType.Object:
                return undefined;
            //case FieldType.Date:
            //case FieldType.DateTime:
            case FieldType.Timestamp:
                return 'Date.now()';
            case FieldType.Boolean:
                return 'false';
        }
        return undefined;
    }
}
