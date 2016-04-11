import * as inquirer from "inquirer";
import {Question} from "inquirer";
import * as _ from "lodash";
import {IFieldProperties, FieldType} from "../../cmn/Field";
import {Util} from "../../util/Util";
import {FileMemeType} from "../../cmn/FileMemeType";
import {TsFileGen} from "../core/TSFileGen";
import {Vesta} from "../file/Vesta";

export class FieldGen {
    private isMultilingual:boolean = false;
    private properties:IFieldProperties = <IFieldProperties>{};
    private needImport:boolean = false;
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
                new inquirer.Separator()
            ]
        };
        inquirer.prompt(question, answer => {
            this.properties.type = <string>answer['fieldType'];
            var questions = this.getRequiredPropertyQuestionsBasedOnFieldType();
            inquirer.prompt(questions, answers => {
                var arr = [];
                for (var property in answers) {
                    if (answers.hasOwnProperty(property)) {
                        if (property == 'enum') {
                            arr = (<string>answers[property]).split(',');
                            for (var i = arr.length; i--;) {
                                arr[i] = _.trim(arr[i]);
                            }
                            this.properties.enum = arr;
                        } else if (property == 'fileType') {
                            arr = (<string>answers[property]).split(',');
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
                                        if (this.properties.fileType.indexOf(meme[j]) < 0) {
                                            this.properties.fileType.push(meme[j]);
                                        }
                                    }
                                } else {
                                    Util.log.error(`Unknown type ${arr[i]}`);
                                }
                            }
                        } else {
                            this.properties[property] = answers[property];
                        }
                    }
                }
                callback();
            });
        })
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
            case FieldType.Text:
                qs.push(<Question>{name: 'minLength', type: 'input', message: 'Min Length: '});
                qs.push(<Question>{name: 'maxLength', type: 'input', message: 'Max Length: '});
                qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
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
                qs.push(<Question>{name: 'fileType', type: 'input', message: 'Valid File Extensions: )'});
                break;
            case FieldType.Boolean:
                askForDefaultValue = true;
                break;
            case FieldType.Object:

                break;
            case FieldType.Enum:
                askForDefaultValue = true;
                qs.push(<Question>{name: 'enum', type: 'input', message: 'Valid Options: '});
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
            //case FieldType.Object:
            //case FieldType.Enum:
            //    return 'any';
        }
        if (this.properties.primary) return 'number|string';
        return 'any';
    }

    private getCodeForFieldType():string {
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
        if (this.properties.fileType.length) {
            code += `.fileType('${this.properties.fileType.join("', '")}')`;
        }
        if (this.properties.enum.length) {
            var enumArray = [],
                firstEnum:string = this.properties.enum[0];
            if (firstEnum.indexOf('.') > 0) {
                this.enumName = firstEnum.substr(0, firstEnum.indexOf('.'));
                this.needImport = true;
                enumArray = this.properties.enum;
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
            code += `.enum(${enumArray.join(", ")})`;
        }
        if (this.properties.default) {
            if (this.properties.enum.length) {
                code += `.default(${firstEnum})`;
            } else {
                code += `.default('${this.properties.default}')`;
            }
        } else if (firstEnum) {
            code += `.default(${firstEnum})`;
        }
        if (this.needImport) {
            Util.log.warning(`Do not forget to import the (${this.enumName})`);
        }
        return code + ';';
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
