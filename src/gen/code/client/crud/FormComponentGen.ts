import { Field, FieldType, IFieldProperties, IModelFields, RelationType, Schema } from "@vesta/core";
import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { Log } from "../../../../util/Log";
import { camelCase, pascalCase, plural } from "../../../../util/StringUtil";
import { ClassGen } from "../../../core/ClassGen";
import { TsFileGen } from "../../../core/TSFileGen";
import { Vesta } from "../../../file/Vesta";
import { IFieldMeta } from "../../FieldGen";
import { ModelGen } from "../../ModelGen";
import { IFormGenConfig } from "../FormGen";

interface IFormFieldData {
    code: string;
    form: string;
    imports?: string[];
}

export class FormComponentGen {
    private className: string;
    private relationalFields: IModelFields;
    private schema: Schema;
    private writtenOnce: any = {};

    constructor(private config: IFormGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Form`;
        mkdir(config.path);
        const model = ModelGen.getModel(config.model);
        this.schema = model.schema;
        ModelGen.getFieldMeta(config.model, "status");
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        const code = this.genCrudFormComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudFormComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        const modelObject = ModelGen.getModel(model.originalClassName);
        const appDir = Vesta.getInstance().directories.app;
        // ts file
        const formFile = new TsFileGen(this.className);
        // imports
        const enumType = this.hasFieldOfType(FieldType.Enum) ? "IFormOption" : null;
        formFile.addImport(["React"], "react", true);
        formFile.addImport(["Component"], "react");
        formFile.addImport(["IValidationError"], genRelativePath(path, `${appDir}/medium`));
        formFile.addImport(["IModelValidationMessage", "validationMessage"], genRelativePath(path, `${appDir}/util/Util`));
        formFile.addImport(["FormWrapper", enumType], genRelativePath(path, `${appDir}/components/general/form/FormWrapper`));
        formFile.addImport([model.interfaceName], genRelativePath(path, `${appDir}/cmn/models/${model.originalClassName}`));
        // props
        const formProps = formFile.addInterface(`I${this.className}Props`);
        formProps.setParentClass(`IBaseComponentProps`);
        formProps.addProperty({ name: "id", type: "number", isOptional: true });
        formProps.addProperty({ name: "goBack", type: `() => void` });
        // state
        const formState = formFile.addInterface(`I${this.className}State`);
        formState.addProperty({ name: model.instanceName, type: model.interfaceName });
        formState.addProperty({ name: "validationErrors", type: "IValidationError", isOptional: true });
        const extStates = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                const field = modelObject.schema.getField(fieldNames[i]);
                const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
                const pluralName = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
                formFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `${appDir}/cmn/models/${meta.relation.model}`));
                formState.addProperty({ name: pluralName, type: `I${meta.relation.model}[]` });
                extStates.push(pluralName);
            }
        }
        // class
        const formClass = formFile.addClass(this.className);
        formClass.shouldExport(true);
        formClass.setParentClass(`Component<I${this.className}Props, I${this.className}State>`);
        // adding form error messages to class
        formClass.addProperty({ name: "formErrorsMessages", type: "IModelValidationMessage", access: "private" });
        // constructor
        formClass.getConstructor().addParameter({ name: "props", type: `I${this.className}Props` });
        formClass.getConstructor().setContent(`super(props);
        this.state = { ${model.instanceName}: {} };
        this.formErrorsMessages = ${this.getValidationErrorMessages()}`);
        // fetch [componentDidMount]
        const fileFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        const files = fileFields ? Object.keys(fileFields) : [];
        let finalCode = `this.setState({${model.instanceName}})`;
        const filesCode = [];
        for (let i = files.length; i--;) {
            filesCode.push(`if (${model.instanceName}.${files[i]}) {
                    ${model.instanceName}.${files[i]} = getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${files[i]}}\`);
                }`);
        }
        if (filesCode.length) {
            formFile.addImport(["getFileUrl"], genRelativePath(path, `${appDir}/util/Util`));
            finalCode = `{
                ${filesCode.join("\n\t\t\t\t")}
                ${finalCode};
            }`;
        }
        formClass.addMethod("componentDidMount").setContent(`const id = +this.props.id;
        if (isNaN(id)) { return; }
        this.service.fetch(id)
            .then((${model.instanceName}) => ${finalCode});`);
        // render
        const formData = this.getFormData(formFile);
        const extStateCode = extStates.length ? `, ${extStates.join(", ")}` : "";
        const extraCode = formData.code ? `\n\t\t${formData.code}` : "";
        formClass.addMethod("render").setContent(`const { ${model.instanceName}, validationErrors${extStateCode} } = this.state;
        const errors = validationErrors ? validationMessage(this.formErrorsMessages, validationErrors) : {};${extraCode}

        return (
            <FormWrapper name="${model.instanceName}Form" onSubmit={this.onSubmit}>${formData.form}
                {this.props.children}
            </FormWrapper>
        );`);
        // onChange method
        const onChange = formClass.addMethod("onChange", "private");
        onChange.setAsArrowFunction(true);
        onChange.addParameter({ name: "name", type: "string" });
        onChange.addParameter({ name: "value", type: "any" });
        onChange.setContent(`const { ${model.instanceName} } = this.state;
        ${model.instanceName}[name] = value;
        this.setState({ ${model.instanceName} });`);
        // onSubmit method
        const onSubmit = formClass.addMethod("onSubmit", "private");
        onSubmit.setAsArrowFunction(true);
        onSubmit.setContent(`const {} = this.state;
        this.service.submit(this.state.${model.instanceName});`);
        // // fetch method
        const fetchMethod = formClass.addMethod(`onFetch`, ClassGen.Access.Private);
        fetchMethod.setAsArrowFunction(true);
        fetchMethod.addParameter({ name: "id", type: "number" });
        fetchMethod.setContent(`this.setState({ showLoader: true });
        return this.api.get<${model.interfaceName}>(\`${model.instanceName}/\${id}\`)
            .then((response) => {
                this.setState({ showLoader: false });
                return response.items[0];
            })
            .catch((error) => {
                this.setState({ showLoader: false });
                this.notif.error(error.message);
            });`);
        // save method
        // files
        // const fileFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        // const files = fileFields ? Object.keys(fileFields) : [];
        const resultCode = `this.setState({ showLoader: false });
                this.notif.success(this.tr("info_save_record"));
                this.onFetchAll(this.state.queryOption);
                this.props.history.goBack();`;
        let deleteCode = "";
        let uploadCode = "";
        let uploadResultCode = "";
        if (files.length) {
            deleteCode = `\n\t\tlet hasFile = false;
        const ${model.instanceName}Files: ${model.interfaceName} = {};`;
            for (let i = files.length; i--;) {
                const fieldName = files[0];
                deleteCode += `\n\t\tif (${model.instanceName}.${fieldName} && ${model.instanceName}.${fieldName} instanceof File) {
            ${model.instanceName}Files.${fieldName} = ${model.instanceName}.${fieldName};
            delete ${model.instanceName}.${fieldName};
            hasFile = true;
        }`;
            }
            uploadCode = `this.api.upload<${model.interfaceName}>(\`${model.instanceName}/file/\${response.items[0].id}\`, ${model.instanceName}Files) : response`;
            uploadResultCode = `\n\t\t\t.then((response) => {
                ${resultCode}
            })`;
        } else {
            uploadCode = `{
                ${resultCode}
            }`;
        }
        const saveMethod = formClass.addMethod(`onSave`, "private");
        saveMethod.setAsArrowFunction(true);
        saveMethod.addParameter({ name: "model", type: model.interfaceName });
        saveMethod.setContent(`const ${model.instanceName} = new ${model.className}(model);
        const validationErrors = ${model.instanceName}.validate();
        if (validationErrors) {
            return this.setState({validationErrors});
        }${deleteCode}
        this.setState({ showLoader: true, validationErrors: null });
        const data = ${model.instanceName}.getValues<${model.interfaceName}>();
        (model.id ? this.api.put<${model.interfaceName}>("${model.instanceName}", data) : this.api.post<${model.interfaceName}>("${model.instanceName}", data))
            .then((response) => ${uploadCode})${uploadResultCode}
            .catch((error) => {
                this.setState({ showLoader: false, validationErrors: error.violations });
                this.notif.error(error.message);
            });`);
        // fetch functions for relations
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                const field = modelObject.schema.getField(fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
                const methodPostfix = pascalCase(shouldBePlural ? plural(fieldNames[i]) : fieldNames[i]);
                const stateVar = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
                const method = formClass.addMethod(`fetch${methodPostfix}`);
                if (meta.relation && meta.relation.model) {
                    const modelName = meta.relation.model;
                    const instanceName = camelCase(modelName);
                    method.setAsArrowFunction(true);
                    method.setContent(`Preloader.show();
        ModelService.getService<I${modelName}>("${instanceName}").fetchAll()
            .then((${stateVar}) => {
                this.setState({ ${stateVar}});
                Preloader.hide();
            });`);
                }
            }
        }
        return formFile.generate();
    }

    private getFieldData(formFile: TsFileGen, modelName: string, field: Field): IFormFieldData {
        const fieldName = field.fieldName;
        if (fieldName === "id") { return null as IFormFieldData; }
        const props: IFieldProperties = field.properties;
        const modelMeta: IFieldMeta = ModelGen.getFieldMeta(modelName, fieldName);
        const appDir = Vesta.getInstance().directories.app;
        if (!modelMeta.form) { return null as IFormFieldData; }
        const instanceName = camelCase(modelName);
        let form = "";
        let code = "";
        const imports = [];
        let component = "";
        let hasPlaceHolder = true;
        const properties = [`name="${fieldName}" label={this.tr("fld_${fieldName}")} value={${instanceName}.${fieldName}}`,
        `error={errors.${fieldName}} onChange={this.onChange}`];
        switch (props.type) {
            case FieldType.Text:
                hasPlaceHolder = !modelMeta.wysiwyg;
                component = modelMeta.wysiwyg ? "Wysiwyg" : "FormTextArea";
                break;
            case FieldType.String:
                component = "FormTextInput";
                break;
            case FieldType.Password:
                component = "FormTextInput";
                properties.push('type="password"');
                break;
            case FieldType.Tel:
                component = "FormTextInput";
                properties.push('type="tel"');
                break;
            case FieldType.EMail:
                component = "FormTextInput";
                properties.push('type="email"');
                break;
            case FieldType.URL:
                component = "FormTextInput";
                properties.push('type="url"');
                break;
            case FieldType.Number:
            case FieldType.Integer:
                component = "FormNumericInput";
                break;
            case FieldType.Float:
                component = "FormNumericInput";
                properties.push(`step={0.1}`);
                break;
            case FieldType.File:
                component = "FormFileInput";
                break;
            case FieldType.Timestamp:
                component = "FormDateTimeInput";
                break;
            case FieldType.Boolean:
                component = "FormSelect";
                const boolOptions = [`{ id: 0, title: this.tr("no") }`, `{ id: 1, title: this.tr("yes") }`];
                const boolOptionName = `booleanOptions`;
                formFile.addImport(["IFormOption"],
                    genRelativePath(this.config.path, `${appDir}/components/general/form/FormWrapper`));
                if (!this.writtenOnce.boolean) {
                    this.writtenOnce.boolean = true;
                    code += `const ${boolOptionName}: IFormOption[] = [\n\t\t\t${boolOptions.join(",\n\t\t\t")},\n\t\t];`;
                }
                properties.push(`options={${boolOptionName}}`);
                break;
            case FieldType.Enum:
                component = "FormSelect";
                const formClass = formFile.getClass();
                if (modelMeta.enum) {
                    const enumName = modelMeta.enum.options[0].split(".")[0];
                    if (modelMeta.enum.path) {
                        formFile.addImport([enumName],
                            genRelativePath(this.config.path, `${appDir}/cmn/${modelMeta.enum.path}`));
                    } else {
                        formFile.addImport([enumName],
                            genRelativePath(this.config.path, `${appDir}/cmn/models/${modelName}`));
                    }
                    const options = modelMeta.enum.options.map((option, index) => `{id: ${option}, title: this.tr("enum_${option.split(".")[1].toLowerCase()}")}`);
                    const optionName = `${fieldName}Options`;
                    // code += `const ${optionName}: any[] = ;`;
                    formClass.addProperty({
                        access: "private",
                        defaultValue: `[\n\t\t${options.join(",\n\t\t")}]`,
                        name: `${fieldName}Options`,
                        type: "IFormOption[]",
                    });
                    properties.push(`options={this.${optionName}}`);
                }
                break;
            case FieldType.Relation:
                if (!modelMeta.relation) { break; }
                const relModelName = modelMeta.relation.model;
                const searchableField = ModelGen.getFieldForFormSelect(relModelName);
                const relInstanceName = camelCase(relModelName);
                const isMulti = props.relation.type === RelationType.Many2Many;
                properties.push(`titleKey="${searchableField}"`);
                const pluralName = isMulti ? fieldName : plural(fieldName);
                if (modelMeta.relation.showAllOptions) {
                    component = isMulti ? "FormMultichoice" : "FormSelect";
                    properties.push(`options={${pluralName}}`);
                } else {
                    // import relational model
                    formFile.addImport([`I${relModelName}`],
                        genRelativePath(this.config.path, `${appDir}/cmn/models/${relModelName}`));
                    const methodName = `search${pascalCase(pluralName)}`;
                    const method = formFile.getClass().addMethod(methodName, ClassGen.Access.Private);
                    method.setAsArrowFunction();
                    method.addParameter({ name: "term", type: "string" });
                    method.setContent(`return this.api.get<I${relModelName}>("${relInstanceName}", {query: {${searchableField}: \`*\${term}*\`}, limit: 10, fields: ["id", "${searchableField}"]})
            .then((response) => response.items);`);
                    component = "Autocomplete";
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
                Log.error(`Unknown field type for ${fieldName} of type ${props.type}`);
        }
        if (component) {
            if (hasPlaceHolder) {
                properties.splice(1, 0, "placeholder={true}");
            }
            imports.push(component);
            form = `\n\t\t\t\t<${component} ${properties[0]} \n\t\t\t\t\t`;
            properties.shift();
            form += `${properties.join(" ")} />`;
        }
        return { imports, form, code };
    }

    private getFieldErrorMessages(field: Field) {
        if (field.fieldName === "id") { return null; }
        const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.modelConfig.originalClassName, field.fieldName);
        if (!meta.form) { return; }
        const messages: any = {};
        const props: IFieldProperties = field.properties;
        if (props.required) {
            messages.required = 'this.tr("err_required")';
        }
        if (props.min) {
            messages.min = `this.tr("err_min_value", ${field.properties.min})`;
        }
        if (props.max) {
            messages.max = `this.tr("err_max_value", ${field.properties.max})`;
        }
        if (props.minLength) {
            messages.minLength = `this.tr("err_min_length", ${field.properties.minLength})`;
        }
        if (props.maxLength) {
            messages.maxLength = `this.tr("err_max_length", ${field.properties.maxLength})`;
        }
        if (props.maxSize) {
            messages.maxSize = `this.tr("err_file_size", ${field.properties.maxSize})`;
        }
        if (props.fileType.length) {
            messages.fileType = `this.tr("err_file_type")`;
        }
        if (props.enum.length) {
            messages.enum = `this.tr("err_enum")`;
        }
        switch (props.type) {
            case FieldType.Text:
                break;
            case FieldType.String:
                break;
            case FieldType.Password:
                break;
            case FieldType.Tel:
                messages.type = `this.tr("err_phone")`;
                break;
            case FieldType.EMail:
                messages.email = `this.tr("err_email")`;
                break;
            case FieldType.URL:
                messages.type = `this.tr("err_url")`;
                break;
            case FieldType.Integer:
            case FieldType.Number:
            case FieldType.Float:
                messages.type = `this.tr("err_number")`;
                break;
            case FieldType.File:
                break;
            case FieldType.Timestamp:
                messages.type = `this.tr("err_date")`;
                break;
            case FieldType.Boolean:
                messages.type = `this.tr("err_enum")`;
                break;
            case FieldType.Enum:
                messages.type = `this.tr("err_enum")`;
                break;
            case FieldType.Relation:
                messages.type = `this.tr("err_relation")`;
                break;
            case FieldType.List:
                break;
            case FieldType.Object:
                break;
        }
        return Object.keys(messages).length ? messages : null;
    }

    private getFormData(formFile: TsFileGen): IFormFieldData {
        const fields = this.schema.getFields();
        const appDir = Vesta.getInstance().directories.app;
        let formComponents = "";
        let formComponentsToImport = [];
        const codes = [];
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            const fieldData = this.getFieldData(formFile, this.schema.name, fields[fieldsName[i]]);
            if (!fieldData) { continue; }
            formComponentsToImport = formComponentsToImport.concat(fieldData.imports);
            formComponents += fieldData.form;
            if (fieldData.code) {
                codes.push(fieldData.code);
            }
        }
        const importedComponents = [];
        formComponentsToImport.forEach((component) => {
            if (importedComponents.indexOf(component) >= 0) { return; }
            formFile.addImport([component], genRelativePath(this.config.path, `${appDir}/components/general/form/${component}`));
        });
        return { form: formComponents, code: codes.join("\n\t\t") };
    }

    private getValidationErrorMessages() {
        const fields = this.schema.getFields();
        const codes = [];
        for (let fieldsName = Object.keys(fields).sort(), i = 0, il = fieldsName.length; i < il; ++i) {
            const messages = this.getFieldErrorMessages(fields[fieldsName[i]]);
            if (!messages) { continue; }
            const code = [];
            for (let rules = Object.keys(messages).sort(), j = 0, jl = rules.length; j < jl; ++j) {
                code.push(`${rules[j]}: ${messages[rules[j]]}`);
            }
            codes.push(`\n\t\t\t${fieldsName[i]}: {\n\t\t\t\t${code.join(",\n\t\t\t\t")},\n\t\t\t}`);
        }
        return codes.length ? `{${codes.join(",")},\n\t\t};` : "";
    }

    private hasFieldOfType(type: FieldType) {
        const fields = this.schema.getFields();
        for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
            if (fields[fieldsName[i]].properties.type === type) { return true; }
        }
        return false;
    }
}
