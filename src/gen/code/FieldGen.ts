import {Question} from "inquirer";
import * as _ from "lodash";
import {TsFileGen} from "../core/TSFileGen";
import {ModelGen} from "./ModelGen";
import {Log} from "../../util/Log";
import {IFieldProperties, FieldType, RelationType} from "vesta-schema/Field";
import {FileMemeType} from "vesta-util/FileMemeType";
import {Util} from "../../util/Util";

export class FieldGen {
    // private isMultilingual:boolean = false;
    private properties:IFieldProperties = <IFieldProperties>{};
    private enumName:string;

    constructor(private modelFile:TsFileGen, private name:string) {
        this.properties.enum = [];
        this.properties.fileType = [];
    }

    private getFieldTypeChoices(isForList:boolean = false):Array<string> {
        return isForList ?
            [
                'String',//FieldType.String,
                'EMail',//FieldType.EMail,
                'Password',//FieldType.Password,
                'Tel',//FieldType.Tel,
                'URL',//FieldType.URL,
                'Number',//FieldType.Number,
                'Integer',//FieldType.Integer,
                'Float',//FieldType.Float,
                'Timestamp',//FieldType.Timestamp,
                'File'//FieldType.File,
            ] :
            [
                'String',//FieldType.String,
                'EMail',//FieldType.EMail,
                'Password',//FieldType.Password,
                'Text',//FieldType.Text,
                'Tel',//FieldType.Tel,
                'URL',//FieldType.URL,
                'Number',//FieldType.Number,
                'Integer',//FieldType.Integer,
                'Float',//FieldType.Float,
                'Timestamp',//FieldType.Timestamp,
                'File',//FieldType.File,
                'Boolean',//FieldType.Boolean,
                'Object',//FieldType.Object,
                'Enum',//FieldType.Enum,
                'Relation',//FieldType.Relation,
                'List'//FieldType.List,
            ];
    }

    public readFieldProperties():Promise<any> {
        let question:Question = <Question>{
            name: 'fieldType',
            type: 'list',
            message: 'Field Type: ',
            default: 'String',
            choices: this.getFieldTypeChoices()
        };
        return Util.prompt<{fieldType:string}>(question)
            .then(fieldTypeAnswer => {
                this.properties.type = FieldType[fieldTypeAnswer.fieldType];
                let questions = this.getQuestionsBasedOnFieldType(this.properties.type, false);
                return Util.prompt<any>(questions);
            })
            .then(answers => {
                this.setPropertiesFromAnswers(answers);
                // if field is of type list, a new series of questions should be answered based on the items type
                if (this.properties.list) {
                    let listQuestions = this.getQuestionsBasedOnFieldType(this.properties.list, true);
                    return Util.prompt(listQuestions).then(answers=> this.setPropertiesFromAnswers(answers));
                }
            });
    }

    private setPropertiesFromAnswers(answers:any) {
        for (let properties = Object.keys(answers), i = 0, il = properties.length; i < il; ++i) {
            let property = properties[i];
            if (['relatedModel'].indexOf(property) >= 0) continue;
            if (property == 'enum') {
                this.properties.enum = (answers.enum).split(',').map(item=>_.trim(item));
            } else if (property == 'fileType') {
                this.properties.fileType = this.getFileTypes(answers.fileType);
            } else if (property == 'relationType') {
                this.properties.relation = {type: answers.relationType, model: answers.relatedModel};
            } else if (property == 'list') {
                this.properties.list = FieldType[<string>answers.list];
            } else {
                this.properties[property] = answers[property];
            }
        }
    }

    public addProperty(name, type) {
        this.properties[name] = type;
    }

    private getFileTypes(answer:string):Array<string> {
        let arr = answer.split(','),
            fileTypes = [];
        for (let i = arr.length; i--;) {
            let meme = [];
            arr[i] = _.trim(arr[i]);
            if (arr[i].indexOf('/') > 0) {
                if (FileMemeType.isValid(arr[i])) {
                    meme = [arr[i]];
                }
            } else {
                meme = FileMemeType.getMeme(arr[i]);
            }
            if (meme.length) {
                for (let j = meme.length; j--;) {
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
            case RelationType.Many2Many:
                return `.areManyOf(${model})`;
            case RelationType.One2One:
                return `.isPartOf(${model})`;
            default:
                return `.isOneOf(${model})`;
        }
    }

    private getRelationNumberFromCode(type:string):number {
        switch (type) {
            case 'One2One':
                return RelationType.One2One;
            case 'Many2Many':
                return RelationType.Many2Many;
        }
        return RelationType.One2Many;
    }

    public setAsPrimary() {
        this.properties.primary = true;
    }

    private getQuestionsBasedOnFieldType(type:FieldType, isListItem:boolean):Array<Question> {
        let askForDefaultValue = false,
            qs:Array<Question> = [];
        if (!isListItem) {
            qs.push(<Question>{name: 'required', type: 'confirm', message: 'Is Required: ', default: false});
        }
        switch (type) {
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
            case FieldType.List:
                qs.push(<Question>{
                    name: 'list',
                    type: 'list',
                    choices: this.getFieldTypeChoices(true),
                    message: 'Type of list items: '
                });
                break;
        }
        if (askForDefaultValue) {
            qs.push(<Question>{name: 'default', type: 'input', message: 'Default Value: '});
        }
        return qs;
    }

    private getCodeForActualFieldType(type:FieldType):string {
        switch (type) {
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
                if (this.properties.relation.type == RelationType.Many2Many) {
                    return `Array<${types}>`;
                }
                return types;
            case FieldType.List:
                return `Array<${this.getCodeForActualFieldType(this.properties.list)}>`;
            //case FieldType.Object:
            //case FieldType.Enum:
            //    return 'any';
        }
        if (this.properties.primary) return 'number|string';
        return 'any';
    }

    private getCodeForFieldType(type:FieldType):string {
        if (this.properties.primary) return 'FieldType.Integer';
        switch (type) {
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
            case FieldType.List:
                return 'FieldType.List';
        }
        return 'FieldType.String';
    }

    public generate():string {
        let code = `${this.modelFile.name}.schema.addField('${this.name}').type(${this.getCodeForFieldType(this.properties.type)})`;
        if (this.properties.type == FieldType.List) code += `.listOf(${this.getCodeForFieldType(this.properties.list)})`;
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
        if (this.properties.default) code += this.getDefaultValueForSchemaCode();
        if (this.properties.relation) {
            let {type, model} = this.properties.relation;
            this.modelFile.addImport(`{I${model}, ${model}}`, `./${model.toString()}`);
            code += this.getRelationCodeFromNumber(type, model.toString());
        }
        return code + ';';
    }

    private genCodeForEnumField():string {
        let enumArray = [],
            firstEnum:string = this.properties.enum[0];
        if (firstEnum.indexOf('.') > 0) {
            this.enumName = firstEnum.substr(0, firstEnum.indexOf('.'));
            enumArray = this.properties.enum;
            Log.warning(`Do not forget to import the (${this.enumName})`);
        } else {
            this.enumName = _.capitalize(this.modelFile.name) + _.capitalize(this.name);
            let enumField = this.modelFile.addEnum(this.enumName);
            enumField.shouldExport(true);
            firstEnum = `${this.enumName}.${firstEnum}`;
            for (let i = 0, il = this.properties.enum.length; i < il; ++i) {
                enumField.addProperty(this.properties.enum[i]);
                let v = _.capitalize(this.properties.enum[i]);
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
        let fieldType = this.properties.type == FieldType.Enum ? this.enumName : this.getCodeForActualFieldType(this.properties.type);
        return {
            fieldName: this.name,
            fieldType: fieldType,
            interfaceFieldType: fieldType,
            defaultValue: this.getDefaultValueForClassProperty()
        }
    }

    private getDefaultValueForSchemaCode() {
        let value = this.properties.default;
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

    private getDefaultValueForClassProperty():string {
        switch (this.properties.type) {
            // case FieldType.String:
            // case FieldType.Text:
            // case FieldType.Password:
            // case FieldType.Tel:
            // case FieldType.EMail:
            // case FieldType.URL:
            // case FieldType.Number:
            // case FieldType.Integer:
            // case FieldType.Float:
            // case FieldType.File:
            // case FieldType.Enum:
            // case FieldType.Object:
            case FieldType.Timestamp:
                return 'Date.now()';
            case FieldType.Boolean:
                return 'false';
            case FieldType.Relation:
                if (this.properties.relation.type == RelationType.Many2Many) return '[]';
                break;
            case FieldType.List:
                return '[]';
        }
        return undefined;
    }
}
