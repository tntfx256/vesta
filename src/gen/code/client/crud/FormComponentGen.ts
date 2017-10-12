import * as fs from "fs";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {ModelGen} from "../../ModelGen";
import {Field, FieldType, IFieldProperties, RelationType, Schema} from "@vesta/core";
import {Log} from "../../../../util/Log";
import {camelCase, strRepeat} from "../../../../util/StringUtil";
import {IFieldMeta} from "../../FieldGen";
import {FormGenConfig} from "../FormGen";

interface IFormFieldData {
    imports?: Array<string>;
    form: string;
    code: string;
}

export class FormComponentGen {
    private className: string;
    private schema: Schema;
    private writtenOnce: any = {};

    constructor(private config: FormGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Form`;
        mkdir(config.path);
        let model = ModelGen.getModel(config.model);
        this.schema = model.schema;
        ModelGen.getFieldMeta(config.model, 'status');
    }

    private genCrudFormComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        // ts file
        let formFile = new TsFileGen(this.className);
        // imports
        formFile.addImport('React', 'react');
        formFile.addImport('{PageComponentProps}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        formFile.addImport('{IValidationError}', genRelativePath(path, 'src/client/app/medium'));
        formFile.addImport('{FieldValidationMessage, ModelValidationMessage, Util}', genRelativePath(path, 'src/client/app/util/Util'));
        formFile.addImport('{TranslateService}', genRelativePath(path, 'src/client/app/service/TranslateService'));
        let otherImports = this.hasFieldOfType(FieldType.Enum) ? ', FormOption' : '';
        formFile.addImport(`{ChangeEventHandler${otherImports}}`, genRelativePath(path, 'src/client/app/components/general/form/FormWrapper'));
        formFile.addImport(`{${model.interfaceName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        formFile.addInterface(`${this.className}Params`);
        // props
        let formProps = formFile.addInterface(`${this.className}Props`);
        formProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        formProps.addProperty({name: model.instanceName, type: model.interfaceName, isOptional: true});
        formProps.addProperty({name: 'onChange', type: 'ChangeEventHandler'});
        formProps.addProperty({name: 'errors', type: 'IValidationError'});
        // form components
        let formData = this.getFormData(formFile);
        let messages = this.getValidationErrorMessages();
        // stateless component
        formFile.addMixin(`
export const ${model.originalClassName}Form = (props: ${formProps.name}) => {
    const tr = TranslateService.getInstance().translate;
    const formErrorsMessages: ModelValidationMessage = {${messages}};
    const errors: FieldValidationMessage = props.errors ? Util.validationMessage(formErrorsMessages, props.errors) : {};
    ${formData.code}
    let ${model.instanceName} = props.${model.instanceName} || {};
    return (
        <div>${formData.form}
        </div>
    )
}`, TsFileGen.CodeLocation.AfterClass);
        return formFile.generate();
    }

    private getFormData(formFile: TsFileGen): IFormFieldData {
        const fields = this.schema.getFields();
        let formComponents = '';
        let formComponentsToImport = [];
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let fieldData = this.getFieldData(formFile, this.schema.name, fields[fieldsName[i]]);
            if (fieldData) {
                formComponentsToImport = formComponentsToImport.concat(fieldData.imports);
                formComponents += fieldData.form;
                if (fieldData.code) {
                    codes.push(fieldData.code);
                }
            }
        }
        let importedComponents = [];
        formComponentsToImport.forEach(component => {
            if (importedComponents.indexOf(component) >= 0) return;
            formFile.addImport(`{${component}}`, genRelativePath(this.config.path, `src/client/app/components/general/form/${component}`));
        });
        return {form: formComponents, code: codes.join('\n\t')};
    }

    private getFieldData(formFile: TsFileGen, modelName: string, field: Field): IFormFieldData {
        let fieldName = field.fieldName;
        if (fieldName == 'id') return <IFormFieldData>null;
        const props: IFieldProperties = field.properties;
        let modelMeta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldName);
        if (modelMeta.hasOwnProperty('form') && !modelMeta.form) return <IFormFieldData>null;
        const instanceName = camelCase(modelName);
        let form = '';
        let code = '';
        let imports = [];
        let component = '';
        let properties = [`name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}`,
            `error={errors.${fieldName}} onChange={props.onChange}`];
        switch (props.type) {
            case FieldType.Text:
                component = 'FormTextArea';
                break;
            case FieldType.String:
                component = 'FormTextInput';
                break;
            case FieldType.Password:
                component = 'FormTextInput';
                properties.push('type="password"');
                break;
            case FieldType.Tel:
                component = 'FormTextInput';
                properties.push('type="tel"');
                break;
            case FieldType.EMail:
                component = 'FormTextInput';
                properties.push('type="email"');
                break;
            case FieldType.URL:
                component = 'FormTextInput';
                properties.push('type="url"');
                break;
            case FieldType.Number:
            case FieldType.Integer:
                component = 'FormNumericInput';
                break;
            case FieldType.Float:
                component = 'FormNumericInput';
                properties.push(`step={0.1}`);
                break;
            case FieldType.File:
                component = 'FormFileInput';
                break;
            case FieldType.Timestamp:
                component = 'FormDateTimeInput';
                properties.push(`dateTime={dateTime}`);
                if (!this.writtenOnce.dateTime) {
                    formFile.addImport('{DateTimeFactory}', genRelativePath(this.config.path, 'src/client/app/medium'));
                    formFile.addImport('{ConfigService}', genRelativePath(this.config.path, 'src/client/app/service/ConfigService'));
                    this.writtenOnce.dateTime = true;
                    code += `const dateTime = DateTimeFactory.create(ConfigService.getConfig().locale)`;
                }
                break;
            case FieldType.Boolean:
                component = 'FormSelect';
                let options = [`{value: 0, title: tr('no')}`, `{value: 1, title: tr('yes')}`];
                let optionName = `booleanOptions`;
                if (!this.writtenOnce.boolean) {
                    this.writtenOnce.boolean = true;
                    code += `const ${optionName}: Array<FormOption> = [\n\t\t${options.join(',\n\t\t')}];`;
                }
                properties.push(`options={${optionName}} nullable={true}`);
                break;
            case FieldType.Enum:
                component = 'FormSelect';
                if (modelMeta.enum) {
                    let enumName = modelMeta.enum.options[0].split('.')[0];
                    if (modelMeta.enum.path) {
                        formFile.addImport(`{${enumName}}`, genRelativePath(this.config.path, `src/client/app/cmn/${modelMeta.enum.path}`));
                    } else {
                        formFile.addImport(`{${enumName}}`, genRelativePath(this.config.path, `src/client/app/cmn/models/${modelName}`));
                    }
                    let options = modelMeta.enum.options.map((option, index) => `{value: ${option}, title: tr('enum_${option.split('.')[1].toLowerCase()}')}`);
                    let optionName = `${fieldName}Options`;
                    code += `const ${optionName}: Array<FormOption> = [\n\t\t${options.join(',\n\t\t')}];`;
                    properties.push(`options={${optionName}} nullable={true}`);
                }
                break;
            case FieldType.Relation:
                if (modelMeta.relation) {
                    switch (props.relation.type) {
                        case RelationType.One2Many:
                        case RelationType.Many2Many:
                            const schema: Schema = props.relation.model.schema;
                            // console.log(schema);
                            break;
                    }
                }
                break;
            case FieldType.List:
                break;
            case FieldType.Object:
                Log.warning(`Unsupported field type for ${fieldName}`);
                break;
            default:
                Log.error(`Unknown field type for ${fieldName} of type ${props.type}`)
        }
        if (component) {
            imports.push(component);
            form = `\n\t\t\t<${component} ${properties[0]}\n\t\t\t${strRepeat(' ', component.length + 2)}`;
            properties.shift();
            form += `${properties.join(' ')}/>`;
        }
        return {imports, form, code}
    }

    private getValidationErrorMessages() {
        const fields = this.schema.getFields();
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let messages = this.getFieldErrorMessages(fields[fieldsName[i]]);
            if (!messages) continue;
            let code = [];
            for (let rules = Object.keys(messages), j = 0, jl = rules.length; j < jl; ++j) {
                code.push(`${rules[j]}: ${messages[rules[j]]}`);
            }
            codes.push(`\n\t\t${fieldsName[i]}: {\n\t\t\t` + code.join(',\n\t\t\t') + '\n\t\t}');
        }
        return codes.length ? (codes.join(',') + '\n\t') : '';
    }

    private getFieldErrorMessages(field: Field) {
        if (field.fieldName == 'id') return null;
        let messages: any = {};
        let props: IFieldProperties = field.properties;
        if (props.required) {
            messages.required = `tr('err_required')`;
        }
        if (props.min) {
            messages.min = `tr('err_min_value', ${field.properties.min})`;
        }
        if (props.max) {
            messages.max = `tr('err_max_value', ${field.properties.max})`;
        }
        if (props.minLength) {
            messages.minLength = `tr('err_min_length', ${field.properties.minLength})`;
        }
        if (props.maxLength) {
            messages.maxLength = `tr('err_max_length', ${field.properties.maxLength})`;
        }
        if (props.maxSize) {
            messages.maxSize = `tr('err_file_size', ${field.properties.maxSize})`;
        }
        if (props.fileType.length) {
            messages.fileType = `tr('err_file_type')`;
        }
        if (props.enum.length) {
            messages.enum = `tr('err_enum')`;
        }
        switch (props.type) {
            case FieldType.Text:
                break;
            case FieldType.String:
                break;
            case FieldType.Password:
                break;
            case FieldType.Tel:
                messages.tel = `tr('err_phone')`;
                break;
            case FieldType.EMail:
                messages.email = `tr('err_email')`;
                break;
            case FieldType.URL:
                messages.url = `tr('err_url')`;
                break;
            case FieldType.Number:
                messages.number = `tr('err_number')`;
                break;
            case FieldType.Integer:
                messages.integer = `tr('err_number')`;
                break;
            case FieldType.Float:
                messages.float = `tr('err_number')`;
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                messages.timestamp = `tr('err_date')`;
                break;
            case FieldType.Boolean:
                break;
            case FieldType.Enum:
                break;
            case FieldType.Relation:
                break;
            case FieldType.List:
                break;
            case FieldType.Object:
                break;
        }
        return Object.keys(messages).length ? messages : null;
    }

    private hasFieldOfType(type: FieldType) {
        const fields = this.schema.getFields();
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            if (fields[fieldsName[i]].properties.type == type) return true;
        }
        return false;
    }

    public generate() {
        let code = this.genCrudFormComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}