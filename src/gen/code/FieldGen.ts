import { FieldType, IFieldProperties, Mime, RelationType } from "@vesta/core";
import { Question } from "inquirer";
import { Log } from "../../util/Log";
import { fcUpper } from "../../util/StringUtil";
import { ask } from "../../util/Util";
import { TsFileGen } from "../core/TSFileGen";
import { ModelGen } from "./ModelGen";

export interface IFieldMeta {
    confidential?: boolean;
    enum?: {
        options: string[];
        path?: string;
    };
    form?: boolean;
    list?: boolean;
    relation?: {
        model: string;
        path?: string;
        showAllOptions?: boolean;
    };
    verifyOwner?: boolean;
    wysiwyg?: boolean;
}

export class FieldGen {
    // private isMultilingual:boolean = false;
    private enumName: string;
    private metaInfo: IFieldMeta = {};
    private properties: IFieldProperties = {} as IFieldProperties;

    constructor(private modelFile: TsFileGen, private name: string) {
        this.properties.enum = [];
        this.properties.fileType = [];
    }

    public addProperty(name, type) {
        this.properties[name] = type;
    }

    public generate(): string {
        const meta: IFieldMeta = {};
        if ("form" in this.metaInfo) { meta.form = this.metaInfo.form; }
        if ("list" in this.metaInfo) { meta.list = this.metaInfo.list; }
        // tslint:disable-next-line:max-line-length
        let code = `${this.modelFile.name}.schema.addField("${this.name}").type(${this.getCodeForFieldType(this.properties.type)})`;
        // tslint:disable-next-line:max-line-length
        if (this.properties.type === FieldType.List) { code += `.listOf(${this.getCodeForFieldType(this.properties.list)})`; }
        if (this.properties.required) { code += ".required()"; }
        if (this.properties.primary) { code += ".primary()"; }
        if (this.properties.unique) { code += ".unique()"; }
        if (this.properties.minLength) { code += `.minLength(${this.properties.minLength})`; }
        if (this.properties.maxLength) { code += `.maxLength(${this.properties.maxLength})`; }
        if (this.properties.min) { code += `.min(${this.properties.min})`; }
        if (this.properties.max) { code += `.max(${this.properties.max})`; }
        if (this.properties.maxSize) { code += `.maxSize(${this.properties.maxSize})`; }
        if (this.properties.fileType.length) { code += `.fileType("${this.properties.fileType.join('", "')}")`; }
        if (this.properties.enum.length) { code += this.genCodeForEnumField(); }
        if (this.properties.default) { code += this.getDefaultValueForSchemaCode(); }
        if (this.properties.relation) {
            const { type, model } = this.properties.relation;
            const modelName = model.toString();
            // meta.relation = { model: modelName };
            this.modelFile.addImport([`I${modelName}`, modelName], `./${modelName}`);
            code += this.getRelationCodeFromNumber(type, modelName);
        }
        if (Object.keys(meta).length) {
            code = `// @${this.name}(${JSON.stringify(meta)})\n${code}`;
        }
        return code + ";";
    }

    // tslint:disable-next-line:max-line-length
    public getNameTypePair(): { defaultValue: string, fieldName: string, fieldType: string, interfaceFieldType: string } {
        const fieldType = this.properties.type === FieldType.Enum ? this.enumName :
            this.getCodeForActualFieldType(this.properties.type);

        return {
            defaultValue: this.getDefaultValueForClassProperty(),
            fieldName: this.name,
            fieldType,
            interfaceFieldType: fieldType,
        };
    }

    public readFieldProperties(): Promise<any> {
        const question: Question = {
            choices: this.getFieldTypeChoices(),
            default: "String",
            message: "Field Type: ",
            name: "fieldType",
            type: "list",
        } as Question;
        return ask<{ fieldType: string }>(question)
            .then((fieldTypeAnswer) => {
                this.properties.type = this.getFieldType(fieldTypeAnswer.fieldType);
                const questions = this.getQuestionsBasedOnFieldType(this.properties.type, false);
                return ask<any>(questions);
            })
            .then((answers) => {
                this.setPropertiesFromAnswers(answers);
                // if field is of type list, a new series of questions should be answered based on the items type
                if (this.properties.list) {
                    const listQuestions = this.getQuestionsBasedOnFieldType(this.properties.list, true);
                    return ask(listQuestions).then((listAnswers) => this.setPropertiesFromAnswers(listAnswers));
                }
            });
    }

    public setAsPrimary() {
        this.properties.primary = true;
    }

    private getFieldTypeChoices(isForList: boolean = false): string[] {
        return isForList ?
            [
                "String", // FieldType.String,
                "EMail", // FieldType.EMail,
                "Password", // FieldType.Password,
                "Tel", // FieldType.Tel,
                "URL", // FieldType.URL,
                "Number", // FieldType.Number,
                "Integer", // FieldType.Integer,
                "Float", // FieldType.Float,
                "Timestamp", // FieldType.Timestamp,
                "File", // FieldType.File,
            ] :
            [
                "String", // FieldType.String,
                "EMail", // FieldType.EMail,
                "Password", // FieldType.Password,
                "Text", // FieldType.Text,
                "Tel", // FieldType.Tel,
                "URL", // FieldType.URL,
                "Number", // FieldType.Number,
                "Integer", // FieldType.Integer,
                "Float", // FieldType.Float,
                "Timestamp", // FieldType.Timestamp,
                "File", // FieldType.File,
                "Boolean", // FieldType.Boolean,
                "Object", // FieldType.Object,
                "Enum", // FieldType.Enum,
                "Relation", // FieldType.Relation,
                "List", // FieldType.List,
            ];
    }

    private getFieldType(name: string): FieldType {
        const map = {
            Boolean: FieldType.Boolean,
            EMail: FieldType.EMail,
            Enum: FieldType.Enum,
            File: FieldType.File,
            Float: FieldType.Float,
            Integer: FieldType.Integer,
            List: FieldType.List,
            Number: FieldType.Number,
            Object: FieldType.Object,
            Password: FieldType.Password,
            Relation: FieldType.Relation,
            String: FieldType.String,
            Tel: FieldType.Tel,
            Text: FieldType.Text,
            Timestamp: FieldType.Timestamp,
            URL: FieldType.URL,
        };
        return map[name] || 0;
    }

    private setPropertiesFromAnswers(answers: any) {
        for (let properties = Object.keys(answers), i = 0, il = properties.length; i < il; ++i) {
            const property = properties[i];
            if (["relatedModel"].indexOf(property) >= 0) { continue; }
            switch (property) {
                case "enum":
                    this.properties.enum = (answers.enum).split(",").map((item) => item.trim());
                    break;
                case "fileType":
                    this.properties.fileType = this.getFileTypes(answers.fileType);
                    break;
                case "relationType":
                    this.properties.relation = { type: answers.relationType, model: answers.relatedModel };
                    break;
                case "list":
                    this.properties.list = this.getFieldType(answers.list);
                    break;
                case "showInList":
                    if (!answers.showInList) { this.metaInfo.list = false; }
                    break;
                case "showInForm":
                    if (!answers.showInForm) { this.metaInfo.form = false; }
                    break;
                default:
                    this.properties[property] = answers[property];
            }
        }
    }

    private getFileTypes(answer: string): string[] {
        const arr = answer.split(",");
        const fileTypes = [];
        for (let i = arr.length; i--;) {
            let meme = [];
            arr[i] = arr[i].trim();
            if (arr[i].indexOf("/") > 0) {
                if (Mime.isValid(arr[i])) {
                    meme = [arr[i]];
                }
            } else {
                meme = Mime.getMime(arr[i]);
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

    private getRelationCodeFromNumber(type: number, model: string): string {
        switch (type) {
            case RelationType.Many2Many:
                return `.areManyOf(${model})`;
            default:
                return `.isOneOf(${model})`;
        }
    }

    private getQuestionsBasedOnFieldType(type: FieldType, isListItem: boolean): Question[] {
        let askForDefaultValue = false;
        const qs: Question[] = [];
        let askForListnForm = false;
        if (!isListItem) {
            qs.push({ name: "required", type: "confirm", message: "Is Required: ", default: false } as Question);
        }
        switch (type) {
            case FieldType.String:
                qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false } as Question);
                qs.push({ name: "minLength", type: "input", message: "Min Length: " } as Question);
                qs.push({ name: "maxLength", type: "input", message: "Max Length: " } as Question);
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
                askForListnForm = true;
                break;
            case FieldType.Text:
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
                break;
            case FieldType.Password:
                qs.push({ name: "minLength", type: "input", message: "Min Length: " } as Question);
                break;
            case FieldType.Tel:
                qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false } as Question);
                askForListnForm = true;
                break;
            case FieldType.EMail:
                qs.push({ name: "unique", type: "confirm", message: "Is Unique: ", default: false } as Question);
                askForListnForm = true;
                break;
            case FieldType.URL:
                break;
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
                qs.push({ name: "min", type: "input", message: "Min Value: " } as Question);
                qs.push({ name: "max", type: "input", message: "Max Value: " } as Question);
                askForDefaultValue = true;
                askForListnForm = true;
                break;
            case FieldType.File:
                qs.push({ name: "maxSize", type: "input", message: "Max File Size (KB): " } as Question);
                qs.push({ name: "fileType", type: "input", message: "Valid File Extensions: " } as Question);
                break;
            case FieldType.Boolean:
                askForDefaultValue = true;
                break;
            case FieldType.Object:
                break;
            case FieldType.Enum:
                // askForDefaultValue = true;
                qs.push({ name: "enum", type: "input", message: "Valid Options: " } as Question);
                askForListnForm = true;
                break;
            case FieldType.Relation:
                const types = ["One2Many", "Many2Many"];
                const models = Object.keys(ModelGen.getModelsList());
                qs.push({ name: "relationType", type: "list", choices: types, message: "Relation Type: " } as Question);
                qs.push({ name: "relatedModel", type: "list", choices: models, message: "Target Model: " } as Question);
                break;
            case FieldType.List:
                qs.push({
                    choices: this.getFieldTypeChoices(true),
                    message: "Type of list items: ",
                    name: "list",
                    type: "list",
                } as Question);
                break;
        }
        if (askForDefaultValue) {
            qs.push({ name: "default", type: "input", message: "Default Value: " } as Question);
        }
        if (askForListnForm) {
            // tslint:disable-next-line:max-line-length
            qs.push({ name: "showInList", type: "confirm", message: "Show in data table: ", default: true } as Question);
            qs.push({ name: "showInForm", type: "confirm", message: "Show in form: ", default: true } as Question);
        }
        return qs;
    }

    private getCodeForActualFieldType(type: FieldType): string {
        switch (type) {
            case FieldType.String:
            case FieldType.Text:
            case FieldType.Password:
            case FieldType.Tel:
            case FieldType.EMail:
            case FieldType.URL:
                return "string";
            case FieldType.Number:
            case FieldType.Integer:
            case FieldType.Float:
            // case FieldType.Date:
            // case FieldType.DateTime:
            case FieldType.Timestamp:
                return "number";
            case FieldType.File:
                return "string | File";
            case FieldType.Boolean:
                return "boolean";
            case FieldType.Relation:
                const types = `number | I${this.properties.relation.model}`;
                if (this.properties.relation.type === RelationType.Many2Many) {
                    return `Array<${types}>`;
                }
                return types;
            case FieldType.List:
                return `Array<${this.getCodeForActualFieldType(this.properties.list)}>`;
            // case FieldType.Object:
            // case FieldType.Enum:
            //    return 'any';
        }
        if (this.properties.primary) { return "number"; }
        return "any";
    }

    private getCodeForFieldType(type: FieldType): string {
        if (this.properties.primary) { return "FieldType.Integer"; }
        switch (type) {
            case FieldType.String:
                return "FieldType.String";
            case FieldType.Text:
                return "FieldType.Text";
            case FieldType.Password:
                return "FieldType.Password";
            case FieldType.Tel:
                return "FieldType.Tel";
            case FieldType.EMail:
                return "FieldType.EMail";
            case FieldType.URL:
                return "FieldType.URL";
            case FieldType.Number:
                return "FieldType.Number";
            case FieldType.Integer:
                return "FieldType.Integer";
            case FieldType.Float:
                return "FieldType.Float";
            case FieldType.File:
                return "FieldType.File";
            // case FieldType.Date:
            //    return 'FieldType.Date';
            // case FieldType.DateTime:
            //    return 'FieldType.DateTime';
            case FieldType.Timestamp:
                return "FieldType.Timestamp";
            case FieldType.Boolean:
                return "FieldType.Boolean";
            case FieldType.Object:
                return "FieldType.Object";
            case FieldType.Enum:
                return "FieldType.Enum";
            case FieldType.Relation:
                return "FieldType.Relation";
            case FieldType.List:
                return "FieldType.List";
        }
        return "FieldType.String";
    }

    private genCodeForEnumField(): string {
        let enumArray = [];
        let firstEnum: string = this.properties.enum[0];
        if (firstEnum.indexOf(".") > 0) {
            this.enumName = firstEnum.substr(0, firstEnum.indexOf("."));
            enumArray = this.properties.enum;
            Log.warning(`Do not forget to import the (${this.enumName})`);
        } else {
            this.enumName = fcUpper(this.modelFile.name) + fcUpper(this.name);
            const enumField = this.modelFile.addEnum(this.enumName);
            enumField.shouldExport(true);
            firstEnum = `${this.enumName}.${firstEnum}`;
            for (let i = 0, il = this.properties.enum.length; i < il; ++i) {
                enumField.addProperty(this.properties.enum[i]);
                const v = fcUpper(this.properties.enum[i]);
                enumArray.push(`${this.enumName}.${v}`);
                if (i === 0) {
                    firstEnum = enumArray[0];
                }
            }
        }
        this.properties.default = enumArray[0];
        return `.enum(${enumArray.join(", ")})`;
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

    private getDefaultValueForClassProperty(): string {
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
                return "Date.now()";
            case FieldType.Boolean:
                return "false";
            case FieldType.Relation:
                if (this.properties.relation.type === RelationType.Many2Many) { return "[]"; }
                break;
            case FieldType.List:
                return "[]";
        }
        return undefined;
    }
}
