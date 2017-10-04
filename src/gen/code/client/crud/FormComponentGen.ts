import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {ModelGen} from "../../ModelGen";
import {Field, FieldType, IFieldProperties, RelationType, Schema} from "@vesta/core";
import {Log} from "../../../../util/Log";
import {camelCase} from "../../../../util/StringUtil";
import {IFieldMeta} from "../../FieldGen";

interface IFormFieldData {
    imports?: Array<string>;
    form: string;
    code: string;
}

export class FormComponentGen {
    private className: string;
    private schema: Schema;

    constructor(private config: CrudComponentGenConfig) {
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
        formProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        // form components
        let formData = this.getFormData(formFile);
        let messages = this.getValidationErrorMessages();
        // stateless component
        formFile.addMixin(`
export const ${model.originalClassName}Form = (props: ${formProps.name}) => {
    const tr = TranslateService.getInstance().translate;
    const formErrorsMessages: ModelValidationMessage = {${messages}};
    let errors: FieldValidationMessage = props.validationErrors ? Util.validationMessage(formErrorsMessages, props.validationErrors) : {};
    ${formData.code}
    let ${model.instanceName} = props.${model.instanceName} || {};
    return (
        <div className="${model.instanceName}Form-component">${formData.form}
        </div>);
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
        switch (props.type) {
            case FieldType.String:
                imports.push('FormTextInput');
                form += `
            <FormTextInput name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                           error={errors.${fieldName}} onChange={props.onChange}/>`;
                break;
            case FieldType.Text:
                imports.push('FormTextArea');
                form += `
            <FormTextArea name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                          error={errors.${fieldName}} onChange={props.onChange}/>`;
                break;
            case FieldType.Password:
                imports.push('FormTextInput');
                form += `
            <FormTextInput name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                           error={errors.${fieldName}} onChange={props.onChange} type="password"/>`;
                break;
            case FieldType.Tel:
                imports.push('FormTextInput');
                form += `
            <FormTextInput name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                           error={errors.${fieldName}} onChange={props.onChange} type="tel"/>`;
                break;
            case FieldType.EMail:
                imports.push('FormTextInput');
                form += `
            <FormTextInput name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                           error={errors.${fieldName}} onChange={props.onChange} type="email"/>`;
                break;
            case FieldType.URL:
                imports.push('FormTextInput');
                form += `
            <FormTextInput name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                           error={errors.${fieldName}} onChange={props.onChange} type="url"/>`;
                break;
            case FieldType.Number:
                break;
            case FieldType.Integer:
                break;
            case FieldType.Float:
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                break;
            case FieldType.Boolean:
                break;
            case FieldType.Enum:
                imports.push('FormSelect');
                if (modelMeta.enum) {
                    if (modelMeta.enum.path) {
                        let enumName = modelMeta.enum.options[0].split('.')[0];
                        formFile.addImport(`{${enumName}}`, genRelativePath(this.config.path, `src/client/app/cmn/${modelMeta.enum.path}`));
                    }
                    let options = modelMeta.enum.options.map((option, index) => `{value: ${option}, title: tr('enum_${option.split('.')[1].toLowerCase()}')}`);
                    let optionName = `${fieldName}Options`;
                    code += `const ${optionName}: Array<FormOption> = [\n\t\t${options.join(',\n\t\t')}];`;
                    form += `
            <FormSelect name="${fieldName}" label={tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}
                        error={errors.${fieldName}} onChange={props.onChange} options={${optionName}}/>`;
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
                code.push(`${rules[j]}: tr('${messages[rules[j]]}')`);
            }
            codes.push(`\n\t\t${fieldsName[i]}: {\n\t\t\t` + code.join(',\n\t\t\t') + '\n\t\t}');
        }
        return codes.length ? (codes.join(',') + '\n\t') : '';
    }

    private getFieldErrorMessages(field: Field) {
        let messages: any = {};
        let props: IFieldProperties = field.properties;
        if (props.required) {
            messages.required = 'err_required';
        }
        if (props.min) {
            messages.min = 'err_min_value';
        }
        if (props.max) {
            messages.max = 'err_max_value';
        }
        if (props.minLength) {
            messages.minLength = 'err_min_length';
        }
        if (props.maxLength) {
            messages.maxLength = 'err_max_length';
        }
        if (props.maxSize) {
            messages.maxSize = 'err_file_size';
        }
        if (props.fileType.length) {
            messages.fileType = 'err_file_type';
        }
        if (props.enum.length) {
            messages.enum = 'err_enum';
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