import { Field, FieldType, IFieldProperties, RelationType } from "@vesta/core";
import { mkdirpSync, writeFileSync } from "fs-extra";
import { camelCase, upperFirst } from "lodash";
import { genRelativePath, isRelative } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { getFieldForFormSelect, getFieldMeta, getFieldsByType, parseModel } from "../../util/Model";
import { pascalCase, plural, tab } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";
import { Vesta } from "../Vesta";

interface IFormFieldData {
  code: string;
  form: string;
  imports?: string[];
}

export interface IFormGenConfig extends IComponentGenConfig {}

export function genForm(config: IFormGenConfig) {
  const model = parseModel(config.model);
  if (!model) {
    return;
  }
  const fileName = `${model.className}Form`;
  const writtenOnce: any = {};
  const schema = model.module.schema;
  const relationalFields = getFieldsByType(config.model, FieldType.Relation);
  // ts file
  const file = new TsFileGen(fileName);
  const method = file.addMethod(fileName);

  setImports();
  setContent();
  try {
    mkdirpSync(config.path);
  } catch (error) {
    //
  }
  writeFileSync(`${config.path}/${fileName}.tsx`, file.generate(), { encoding: "utf8" });

  function setImports() {
    // imports
    const enumType = hasFieldOfType(FieldType.Enum) || hasFieldOfType(FieldType.Boolean) ? "IFormOption" : null;
    file.addImport(["React"], "react", true);
    file.addImport(["ComponentType", "useEffect", "useState"], "react");
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["IValidationError", "validationMessage"], "@vesta/core");
    file.addImport(["FormWrapper", enumType, "IComponentProps"], "@vesta/components");
    file.addImport(["getCrudInstance"], genRelativePath(config.path, "src/service/Crud.ts"));
    file.addImport([model.interfaceName, model.className], genRelativePath(config.path, model.file));
    // props
    const props = file.addInterface(`I${fileName}Props`);
    props.setParentClass(`IComponentProps`);
    props.addProperty({ name: "id", type: "number", isOptional: true });
    props.addProperty({ name: "goBack", type: `() => void` });
  }

  function setContent() {
    method.addParameter({ name: "props", type: `I${fileName}Props` });
    method.methodType = `ComponentType<I${fileName}Props>`;
    method.shouldExport = true;
    method.isArrow = true;

    method.appendContent(`
    const tr = Culture.getDictionary().translate;
    const [service] = useState(getCrudInstance<${model.interfaceName}>("${model.instanceName}"));
    const [${model.instanceName}, set${model.className}] = useState<${model.interfaceName}>({});
    const [errors, setErrors] = useState<IValidationError>(null);`);

    // state
    // const extStates = [];
    if (relationalFields) {
      for (let fieldNames = Object.keys(relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
        const fieldMeta: IFieldMeta = getFieldMeta(config.model, fieldNames[i]);
        if (!fieldMeta.form) {
          continue;
        }
        const field = schema.getField(fieldNames[i]);
        const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
        const pluralName = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
        file.addImport([`I${fieldMeta.relation.model}`], genRelativePath(config.path, `${Vesta.directories.model}/${fieldMeta.relation.model}`));
        // extStates.push(pluralName);
        method.appendContent(`const [${pluralName}, set${upperFirst(pluralName)}] = useState<I${fieldMeta.relation.model}[]>([]);`);
      }
    }

    method.appendContent(`
    ${getAllEnums()}
    const formErrorsMessages = ${getValidationErrorMessages()}
`);

    // const fetchCodes = [];
    const fetchedResultName = "data";
    let finalCode = `set${model.className}(${fetchedResultName})`;

    // convert relational data array to number array for multichoice
    const relationsCode = [];
    if (relationalFields) {
      for (let fieldNames = Object.keys(relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
        const meta: IFieldMeta = getFieldMeta(config.model, fieldNames[i]);
        const field = schema.getField(fieldNames[i]);
        const isMulti = field.properties.relation.type === RelationType.Many2Many;
        if (!meta.form || !meta.relation || !meta.relation.model || !isMulti) {
          continue;
        }
        const relationalModelName = meta.relation.model;
        relationsCode.push(`${fetchedResultName}.${fieldNames[i]} = (${fetchedResultName}.${fieldNames[i]} as I${relationalModelName}[]).map(r => r.id);`);
      }
    }

    const fileFields = getFieldsByType(config.model, FieldType.File);
    const files = fileFields ? Object.keys(fileFields) : [];

    const filesCode = [];

    for (let i = files.length; i--; ) {
      filesCode.push(`if (${fetchedResultName}.${files[i]}) {
                ${fetchedResultName}.${files[i]} = getFileUrl(\`${model.instanceName}/\${${fetchedResultName}.${files[i]}}\`);
            }`);
    }
    if (filesCode.length || relationsCode.length) {
      if (filesCode.length) {
        file.addImport(["getFileUrl"], genRelativePath(config.path, `${Vesta.directories.app}/util`));
      }
      finalCode = `{
            ${relationsCode.join(`\n${tab(3)}`)}
            ${filesCode.join(`\n${tab(3)}`)}
            ${finalCode};
        }`;
    }

    // call fetch methods for all relations with showAll option
    // fetch functions for relations
    const callToFetchRelationsMethods = [];
    if (relationalFields) {
      for (let fieldNames = Object.keys(relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
        const meta: IFieldMeta = getFieldMeta(config.model, fieldNames[i]);
        const field = schema.getField(fieldNames[i]);
        if (!meta.form || !meta.relation || !meta.relation.model) {
          continue;
        }
        // const stateVar = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
        const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
        const methodPostfix = pascalCase(shouldBePlural ? plural(fieldNames[i]) : fieldNames[i]);
        if (meta.relation.showAllOptions) {
          callToFetchRelationsMethods.push(`fetch${methodPostfix}();`);
        }
      }
    }
    method.appendContent(`useEffect(() => {
        ${callToFetchRelationsMethods.join("\n\t\t")}
        const id = +props.id;
        if (isNaN(id)) { return; }
        service.fetch(id).then((${fetchedResultName}) => ${finalCode});
    }, [props.id]);`);

    // render
    const formData = getFormData();
    // const extStateCode = extStates.length ? `, ${extStates.join(", ")}` : "";
    const extraCode = formData.code ? `\n${tab(2)}${formData.code}` : "";
    method.appendContent(`
    const errorMessages = errors ? validationMessage(formErrorsMessages, errors) : {};${extraCode}

    return (
        <FormWrapper name="${model.instanceName}Form" onSubmit={onSubmit}>${formData.form}
            {props.children}
        </FormWrapper>
    );`);

    // onChange method
    const onChangeFunction = method.addMethod("onChange");
    onChangeFunction.addParameter({ name: "name", type: "string" });
    onChangeFunction.addParameter({ name: "value", type: "any" });
    onChangeFunction.appendContent(`set${model.className}({ ...${model.instanceName}, [name]: value});`);

    // save method
    const onSubmitFunction = method.addMethod("onSubmit");
    let fileCode = "";
    if (files.length) {
      fileCode = `\n${tab(2)}let hasFile = false;
        const ${model.instanceName}Files: ${model.interfaceName} = {};`;
      for (let i = files.length; i--; ) {
        const fieldName = files[i];
        fileCode += `\n${tab(2)}if (${model.instanceName}.${fieldName} && ${model.instanceName}.${fieldName} instanceof File) {
            ${model.instanceName}Files.${fieldName} = ${model.instanceName}.${fieldName};
            delete ${model.instanceName}Model.${fieldName};
            hasFile = true;
        }`;
      }
    }
    onSubmitFunction.appendContent(`const ${model.instanceName}Model = new ${model.className}(${model.instanceName});

        const validationErrors = ${model.instanceName}Model.validate();
        if (validationErrors) {
            return setErrors(validationErrors);
        }${fileCode}
        setErrors(null);
        const data = ${model.instanceName}Model.getValues<${model.interfaceName}>();
        service.save(data, ${files.length ? `hasFile ? ${model.instanceName}Files : null` : ""})
            .then((response) => props.goBack())
            .catch((error) => setErrors(error.violations));`);

    // fetch functions for relations
    if (relationalFields) {
      for (let fieldNames = Object.keys(relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
        const meta: IFieldMeta = getFieldMeta(config.model, fieldNames[i]);
        const field = schema.getField(fieldNames[i]);
        if (!meta.form || !meta.relation || !meta.relation.model) {
          continue;
        }
        // const stateVar = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
        const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
        const methodPostfix = pascalCase(shouldBePlural ? plural(fieldNames[i]) : fieldNames[i]);
        const relationalModelName = meta.relation.model;
        const relationalModelInstanceName = camelCase(relationalModelName);
        // const instanceName = camelCase(modelName);
        if (meta.relation.showAllOptions) {
          const relationFetchMethod = method.addMethod(`fetch${methodPostfix}`);
          relationFetchMethod.appendContent(`getCrudInstance<I${relationalModelName}>("${relationalModelInstanceName}").fetchAll()
            .then((data) => set${methodPostfix}(data));`);
        }
      }
    }
  }

  function getAllEnums() {
    const fields = schema.getFields();
    let code = "";
    for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
      const field = fields[fieldsName[i]];
      const fieldName = field.fieldName;
      const fieldMeta = getFieldMeta(schema.name, fieldName);
      if (field.properties.type === FieldType.Boolean) {
        const boolOptions = [`{ id: 0, title: tr("no") }`, `{ id: 1, title: tr("yes") }`];
        const boolOptionName = `booleanOptions`;

        if (!writtenOnce.boolean) {
          writtenOnce.boolean = true;
          code += `const ${boolOptionName}: IFormOption[] = [\n${tab(2)}${boolOptions.join(`,\n${tab(2)}`)},\n${tab(1)}];`;
        }
      } else if (field.properties.type === FieldType.Enum) {
        if (fieldMeta.enum) {
          const options = fieldMeta.enum.options.map((option, index) => `{id: ${option}, title: tr("enum_${option.split(".")[1].toLowerCase()}")}`);
          const enumOptionsName = `${fieldName}Options`;
          code += `const ${enumOptionsName}: IFormOption[] = [ ${options.join(", ")} ];`;
        }
      }
    }
    return code;
  }

  function getFieldData(field: Field): IFormFieldData | null {
    const fieldName = field.fieldName;
    if (fieldName === "id") {
      return null;
    }
    const fieldProps: IFieldProperties = field.properties;
    const fieldMeta: IFieldMeta = getFieldMeta(config.model, fieldName);
    if (!fieldMeta.form) {
      return null;
    }
    let form = "";
    let formCode = "";
    const imports = [];
    let component = "";
    const properties = [
      `name="${fieldName}" label={tr("fld_${fieldName}")}`,
      `value={${model.instanceName}.${fieldName}}`,
      `error={errorMessages.${fieldName}} onChange={onChange}`,
    ];
    switch (fieldProps.type) {
      case FieldType.Text:
        component = fieldMeta.wysiwyg ? "Wysiwyg" : "TextArea";
        break;
      case FieldType.String:
        component = "TextInput";
        break;
      case FieldType.Password:
        component = "TextInput";
        properties.push('type="password"');
        break;
      case FieldType.Tel:
        component = "TextInput";
        properties.push('type="tel"');
        break;
      case FieldType.EMail:
        component = "TextInput";
        properties.push('type="email"');
        break;
      case FieldType.URL:
        component = "TextInput";
        properties.push('type="url"');
        break;
      case FieldType.Number:
      case FieldType.Integer:
        component = "NumericInput";
        break;
      case FieldType.Float:
        component = "NumericInput";
        properties.push(`step={0.1}`);
        break;
      case FieldType.File:
        component = "FileInput";
        break;
      case FieldType.Timestamp:
        component = "DateTimeInput";
        break;
      case FieldType.Boolean:
        component = "Select";
        const boolOptionName = `booleanOptions`;
        properties.push(`options={${boolOptionName}}`);
        break;
      case FieldType.Enum:
        component = "Select";

        if (fieldMeta.enum) {
          const enumName = fieldMeta.enum.options[0].split(".")[0];
          if (fieldMeta.enum.path) {
            if (isRelative(fieldMeta.enum.path)) {
              file.addImport([enumName], genRelativePath(config.path, `${Vesta.directories.cmn}/${fieldMeta.enum.path}`));
            } else {
              file.addImport([enumName], fieldMeta.enum.path);
            }
          } else {
            file.addImport([enumName], genRelativePath(config.path, model.file));
          }
          const optionName = `${fieldName}Options`;
          properties.push(`options={${optionName}}`);
        }
        break;
      case FieldType.Relation:
        if (!fieldMeta.relation) {
          break;
        }
        const relModelName = fieldMeta.relation.model;
        const searchableField = getFieldForFormSelect(relModelName);
        const relInstanceName = camelCase(relModelName);
        const isMulti = fieldProps.relation.type === RelationType.Many2Many;
        properties.push(`titleKey="${searchableField}"`);
        const pluralName = isMulti ? fieldName : plural(fieldName);

        if (isMulti) {
          // changing the value by casting type as number[]
          properties[1] = properties[1].replace("}", " as number[]}");
        }

        if (fieldMeta.relation.showAllOptions) {
          component = isMulti ? "Multichoice" : "Select";
          properties.push(`options={${pluralName}}`);
        } else {
          // import relational model
          file.addImport([`I${relModelName}`], genRelativePath(config.path, `${Vesta.directories.model}/${relModelName}`));
          const methodName = `search${pascalCase(pluralName)}`;
          const searchMethod = method.addMethod(methodName);
          searchMethod.addParameter({ name: "term", type: "string" });
          searchMethod.appendContent(
            `return getCrudInstance<I${relModelName}>("${relInstanceName}").fetchAll({query: {${searchableField}: \`*\${term}*\`}, limit: 10, fields: ["id", "${searchableField}"]});`
          );
          component = "Autocomplete";
          properties.push(`onSearch={${methodName}}`);
          if (isMulti) {
            properties.push(`multi={true}`);
          }
        }
        break;
      case FieldType.List:
        component = "Multichoice";
        break;
      case FieldType.Object:
        Log.warning(`Unsupported field type for ${fieldName}`);
        break;
      default:
        Log.error(`Unknown field type for ${fieldName} of type ${fieldProps.type}`);
    }
    if (component) {
      imports.push(component);
      form = `\n${tab(3)}<${component} ${properties.shift()}\n${tab(4)}`;
      form += `${properties.join(" ")} />`;
    }
    return { imports, form, code: formCode };
  }

  function getFieldErrorMessages(field: Field) {
    if (field.fieldName === "id") {
      return null;
    }
    const meta: IFieldMeta = getFieldMeta(config.model, field.fieldName);
    if (!meta.form) {
      return;
    }
    const messages: any = {};
    const fieldProps: IFieldProperties = field.properties;
    if (fieldProps.required) {
      messages.required = 'tr("err_required")';
    }
    if (fieldProps.min) {
      messages.min = `tr("err_min_value", ${field.properties.min})`;
    }
    if (fieldProps.max) {
      messages.max = `tr("err_max_value", ${field.properties.max})`;
    }
    if (fieldProps.minLength) {
      messages.minLength = `tr("err_min_length", ${field.properties.minLength})`;
    }
    if (fieldProps.maxLength) {
      messages.maxLength = `tr("err_max_length", ${field.properties.maxLength})`;
    }
    if (fieldProps.maxSize) {
      messages.maxSize = `tr("err_file_size", ${field.properties.maxSize})`;
    }
    if (fieldProps.fileType.length) {
      messages.fileType = `tr("err_file_type")`;
    }
    if (fieldProps.enum.length) {
      messages.enum = `tr("err_enum")`;
    }
    switch (fieldProps.type) {
      case FieldType.Text:
        break;
      case FieldType.String:
        break;
      case FieldType.Password:
        break;
      case FieldType.Tel:
        messages.type = `tr("err_phone")`;
        break;
      case FieldType.EMail:
        messages.email = `tr("err_email")`;
        break;
      case FieldType.URL:
        messages.type = `tr("err_url")`;
        break;
      case FieldType.Integer:
      case FieldType.Number:
      case FieldType.Float:
        messages.type = `tr("err_number")`;
        break;
      case FieldType.File:
        break;
      case FieldType.Timestamp:
        messages.type = `tr("err_date")`;
        break;
      case FieldType.Boolean:
        messages.type = `tr("err_enum")`;
        break;
      case FieldType.Enum:
        messages.type = `tr("err_enum")`;
        break;
      case FieldType.Relation:
        messages.type = `tr("err_relation")`;
        break;
      case FieldType.List:
        break;
      case FieldType.Object:
        break;
    }
    return Object.keys(messages).length ? messages : null;
  }

  function getFormData(): IFormFieldData {
    const fields = schema.getFields();
    let formComponents = "";
    let formComponentsToImport = [];
    const codes = [];
    for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
      const fieldData = getFieldData(fields[fieldsName[i]]);
      if (!fieldData) {
        continue;
      }
      formComponentsToImport = formComponentsToImport.concat(fieldData.imports);
      formComponents += fieldData.form;
      if (fieldData.code) {
        codes.push(fieldData.code);
      }
    }
    const importedComponents = [];
    formComponentsToImport.forEach(component => {
      if (importedComponents.indexOf(component) >= 0) {
        return;
      }
      file.addImport([component], "@vesta/components");
    });
    return { form: formComponents, code: codes.join(`\n${tab(2)}`) };
  }

  function getValidationErrorMessages() {
    const fields = schema.getFields();
    const codes = [];
    for (let fieldsName = Object.keys(fields).sort(), i = 0, il = fieldsName.length; i < il; ++i) {
      const messages = getFieldErrorMessages(fields[fieldsName[i]]);
      if (!messages) {
        continue;
      }
      const partialCodes: string[] = [];
      for (let rules = Object.keys(messages).sort(), j = 0, jl = rules.length; j < jl; ++j) {
        partialCodes.push(`${rules[j]}: ${messages[rules[j]]}`);
      }
      codes.push(`\n${tab(2)}${fieldsName[i]}: {\n${tab(3)}${partialCodes.join(`,\n${tab(3)}`)},\n${tab(2)}}`);
    }
    return codes.length ? `{${codes.join(",")},\n${tab()}};` : "";
  }

  function hasFieldOfType(type: FieldType) {
    const fields = schema.getFields();
    for (let fieldsName = Object.keys(fields), i = 0, il = fieldsName.length; i < il; ++i) {
      if (fields[fieldsName[i]].properties.type === type) {
        return true;
      }
    }
    return false;
  }
}
