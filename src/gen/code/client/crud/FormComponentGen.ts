import * as fs from "fs";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {ModelGen} from "../../ModelGen";
import {Log} from "../../../../util/Log";
import {camelCase, pascalCase, plural, strRepeat} from "../../../../util/StringUtil";
import {IFieldMeta} from "../../FieldGen";
import {FormGenConfig} from "../FormGen";
import {Schema} from "../../../../cmn/core/Schema";
import {IModelFields} from "../../../../cmn/core/Model";
import {Field, FieldType, IFieldProperties, RelationType} from "../../../../cmn/core/Field";
import {ClassGen} from "../../../core/ClassGen";

interface IFormFieldData {
    imports?: Array<string>;
    form: string;
    code: string;
}

export class FormComponentGen {
    private className: string;
    private schema: Schema;
    private writtenOnce: any = {};
    private relationalFields: IModelFields;

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
        const modelObject = ModelGen.getModel(model.originalClassName);
        // ts file
        let formFile = new TsFileGen(this.className);
        // imports
        formFile.addImport(['React'], 'react', true);
        formFile.addImport(['FetchById', 'PageComponent', 'PageComponentProps', 'Save'], genRelativePath(path, 'src/client/app/components/PageComponent'));
        formFile.addImport(['IValidationError'], genRelativePath(path, 'src/client/app/cmn/core/Validator'));
        formFile.addImport(['ModelValidationMessage', 'validationMessage'], genRelativePath(path, 'src/client/app/util/Util'));
        formFile.addImport(['FormWrapper', this.hasFieldOfType(FieldType.Enum) ? 'FormOption' : null], genRelativePath(path, 'src/client/app/components/general/form/FormWrapper'));
        formFile.addImport([model.interfaceName], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        formFile.addInterface(`${this.className}Params`);
        // props
        const extProps = [];
        let formProps = formFile.addInterface(`${this.className}Props`);
        formProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        formProps.addProperty({name: 'id', type: 'number', isOptional: true});
        formProps.addProperty({name: 'onFetch', type: `FetchById<${model.interfaceName}>`, isOptional: true});
        formProps.addProperty({name: 'onSave', type: `Save<${model.interfaceName}>`});
        formProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) continue;
                const shouldBePlural = modelObject.schema.getField(fieldNames[i]).properties.relation.type != RelationType.Many2Many;
                formFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                let pluralName = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
                formProps.addProperty({
                    name: pluralName,
                    type: `Array<I${meta.relation.model}>`
                });
                extProps.push(pluralName);
            }
        }
        // state
        let formState = formFile.addInterface(`${this.className}State`);
        formState.addProperty({name: model.instanceName, type: model.interfaceName});
        // class
        let formClass = formFile.addClass(this.className);
        formClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // adding form error messages to class
        formClass.addProperty({name: 'formErrorsMessages', type: 'ModelValidationMessage', access: 'private'});
        // constructor
        formClass.getConstructor().addParameter({name: 'props', type: `${this.className}Props`});
        formClass.getConstructor().setContent(`super(props);
        this.state = {${model.instanceName}: {}};
        this.formErrorsMessages = ${this.getValidationErrorMessages()}`);
        // fetch [componentDidMount]
        let fileFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        let files = fileFields ? Object.keys(fileFields) : [];
        let finalCode = `this.setState({${model.instanceName}})`;
        let filesCode = [];
        for (let i = files.length; i--;) {
            filesCode.push(`if (${model.instanceName}.${files[i]}) {
                    ${model.instanceName}.${files[i]} = getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${files[i]}}\`);
                }`);
        }
        if (filesCode.length) {
            formFile.addImport(['getFileUrl'], genRelativePath(path, 'src/client/app/util/Util'));
            finalCode = `{
                ${filesCode.join('\n\t\t\t\t')}
                ${finalCode};
            }`;
        }
        formClass.addMethod('componentDidMount').setContent(`const id = +this.props.id;
        if (isNaN(id)) return;
        this.props.onFetch(id)
            .then(${model.instanceName} => ${finalCode});`);
        // onChange method
        let onChange = formClass.addMethod('onChange');
        onChange.setAsArrowFunction(true);
        onChange.addParameter({name: 'name', type: 'string'});
        onChange.addParameter({name: 'value', type: 'any'});
        onChange.setContent(`this.state.${model.instanceName}[name] = value;
        this.setState({${model.instanceName}: this.state.${model.instanceName}});`);
        // onSubmit method
        let onSubmit = formClass.addMethod('onSubmit');
        onSubmit.setAsArrowFunction(true);
        onSubmit.addParameter({name: 'e', type: 'Event'});
        onSubmit.setContent(`this.props.onSave(this.state.${model.instanceName});`);
        // render
        let formData = this.getFormData(formFile);
        const extPropsCode = extProps.length ? `, ${extProps.join(', ')}` : '';
        const extraCode = formData.code ? `\n\t\t${formData.code}` : '';
        formClass.addMethod('render').setContent(`const {validationErrors${extPropsCode}} = this.props;
        const {${model.instanceName}} = this.state;
        const errors = validationErrors ? validationMessage(this.formErrorsMessages, validationErrors) : {};${extraCode}
        
        return (
            <FormWrapper name="${model.instanceName}Form" onSubmit={this.onSubmit}>${formData.form}
                {this.props.children}
            </FormWrapper>
        )`);
        return formFile.generate();
    }

    private getFormData(formFile: TsFileGen): IFormFieldData {
        const fields = this.schema.getFields();
        let formComponents = '';
        let formComponentsToImport = [];
        let codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            let fieldData = this.getFieldData(formFile, this.schema.name, fields[fieldsName[i]]);
            if (!fieldData) continue;
            formComponentsToImport = formComponentsToImport.concat(fieldData.imports);
            formComponents += fieldData.form;
            if (fieldData.code) {
                codes.push(fieldData.code);
            }
        }
        let importedComponents = [];
        formComponentsToImport.forEach(component => {
            if (importedComponents.indexOf(component) >= 0) return;
            formFile.addImport([component], genRelativePath(this.config.path, `src/client/app/components/general/form/${component}`));
        });
        return {form: formComponents, code: codes.join('\n\t\t')};
    }

    private getFieldData(formFile: TsFileGen, modelName: string, field: Field): IFormFieldData {
        let fieldName = field.fieldName;
        if (fieldName == 'id') return <IFormFieldData>null;
        const props: IFieldProperties = field.properties;
        let modelMeta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldName);
        if (!modelMeta.form) return <IFormFieldData>null;
        const instanceName = camelCase(modelName);
        let form = '';
        let code = '';
        let imports = [];
        let component = '';
        let hasPlaceHolder = true;
        let properties = [`name="${fieldName}" label={this.tr('fld_${fieldName}')} value={${instanceName}.${fieldName}}`,
            `error={errors.${fieldName}} onChange={this.onChange}`];
        switch (props.type) {
            case FieldType.Text:
                hasPlaceHolder = !modelMeta.wysiwyg;
                component = modelMeta.wysiwyg ? 'Wysiwyg' : 'FormTextArea';
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
                break;
            case FieldType.Boolean:
                component = 'FormSelect';
                let options = [`{id: 0, title: this.tr('no')}`, `{id: 1, title: this.tr('yes')}`];
                let optionName = `booleanOptions`;
                if (!this.writtenOnce.boolean) {
                    this.writtenOnce.boolean = true;
                    code += `const ${optionName}: Array<FormOption> = [\n\t\t${options.join(',\n\t\t')}];`;
                }
                properties.push(`options={${optionName}}`);
                break;
            case FieldType.Enum:
                component = 'FormSelect';
                const formClass = formFile.getClass();
                if (modelMeta.enum) {
                    let enumName = modelMeta.enum.options[0].split('.')[0];
                    if (modelMeta.enum.path) {
                        formFile.addImport([enumName], genRelativePath(this.config.path, `src/client/app/cmn/${modelMeta.enum.path}`));
                    } else {
                        formFile.addImport([enumName], genRelativePath(this.config.path, `src/client/app/cmn/models/${modelName}`));
                    }
                    let options = modelMeta.enum.options.map((option, index) => `{id: ${option}, title: this.tr('enum_${option.split('.')[1].toLowerCase()}')}`);
                    let optionName = `${fieldName}Options`;
                    // code += `const ${optionName}: Array<{}> = ;`;
                    formClass.addProperty({
                        name: `${fieldName}Options`,
                        type: 'Array<FormOption>',
                        access: 'private',
                        defaultValue: `[\n\t\t${options.join(',\n\t\t')}]`
                    });
                    properties.push(`options={this.${optionName}}`);
                }
                break;
            case FieldType.Relation:
                if (!modelMeta.relation) break;
                const relModelName = modelMeta.relation.model;
                const searchableField = ModelGen.getFieldForFormSelect(relModelName);
                const relInstanceName = camelCase(relModelName);
                let isMulti = props.relation.type == RelationType.Many2Many;
                properties.push(`titleKey="${searchableField}"`);
                const pluralName = isMulti ? fieldName : plural(fieldName);
                if (modelMeta.relation.showAllOptions) {
                    component = isMulti ? 'FormMultichoice' : 'FormSelect';
                    properties.push(`options={${pluralName}}`);
                } else {
                    const methodName = `search${pascalCase(pluralName)}`;
                    const method = formFile.getClass().addMethod(methodName, ClassGen.Access.Private);
                    method.setAsArrowFunction();
                    method.addParameter({name: 'term', type: 'string'});
                    method.setContent(`return this.api.get<I${modelName}>('${relInstanceName}', {query: {${searchableField}: \`*\${term}*\`}, limit: 10, fields: ['id', '${searchableField}']})
            .then(response => response.items)`);
                    component = 'Autocomplete';
                    properties.push(`search={this.${methodName}}`);
                    if (isMulti) {
                        properties.push(`multi={true}`);
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
            if (hasPlaceHolder) {
                properties.splice(1, 0, 'placeholder={true}');
            }
            imports.push(component);
            form = `\n\t\t\t\t<${component} ${properties[0]}\n\t\t\t\t${strRepeat(' ', component.length + 2)}`;
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
            codes.push(`\n\t\t\t${fieldsName[i]}: {\n\t\t\t\t${code.join(',\n\t\t\t\t')}\n\t\t\t}`);
        }
        return codes.length ? `{${codes.join(',')}\n\t\t}` : '';
    }

    private getFieldErrorMessages(field: Field) {
        if (field.fieldName == 'id') return null;
        const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.modelConfig.originalClassName, field.fieldName);
        if (!meta.form) return;
        let messages: any = {};
        let props: IFieldProperties = field.properties;
        if (props.required) {
            messages.required = "this.tr('err_required')";
        }
        if (props.min) {
            messages.min = `this.tr('err_min_value', ${field.properties.min})`;
        }
        if (props.max) {
            messages.max = `this.tr('err_max_value', ${field.properties.max})`;
        }
        if (props.minLength) {
            messages.minLength = `this.tr('err_min_length', ${field.properties.minLength})`;
        }
        if (props.maxLength) {
            messages.maxLength = `this.tr('err_max_length', ${field.properties.maxLength})`;
        }
        if (props.maxSize) {
            messages.maxSize = `this.tr('err_file_size', ${field.properties.maxSize})`;
        }
        if (props.fileType.length) {
            messages.fileType = `this.tr('err_file_type')`;
        }
        if (props.enum.length) {
            messages.enum = `this.tr('err_enum')`;
        }
        switch (props.type) {
            case FieldType.Text:
                break;
            case FieldType.String:
                break;
            case FieldType.Password:
                break;
            case FieldType.Tel:
                messages.type = `this.tr('err_phone')`;
                break;
            case FieldType.EMail:
                messages.email = `this.tr('err_email')`;
                break;
            case FieldType.URL:
                messages.type = `this.tr('err_url')`;
                break;
            case FieldType.Integer:
            case FieldType.Number:
            case FieldType.Float:
                messages.type = `this.tr('err_number')`;
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                messages.type = `this.tr('err_date')`;
                break;
            case FieldType.Boolean:
                messages.type = `this.tr('err_enum')`;
                break;
            case FieldType.Enum:
                messages.type = `this.tr('err_enum')`;
                break;
            case FieldType.Relation:
                messages.type = `this.tr('err_relation')`;
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
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        let code = this.genCrudFormComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}