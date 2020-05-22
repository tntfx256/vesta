import { Field, FieldType } from "@vesta/core";
import { mkdirpSync } from "fs-extra";
import { camelCase, upperFirst } from "lodash";
import { isRelative, saveCodeToFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { getFieldForFormSelect, getFieldMeta, getFieldsByType, parseModel } from "../../util/Model";
import { pascalCase } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";

interface IFormFieldData {
  code: string;
  form: string;
  imports?: string[];
}

// tslint:disable-next-line: no-empty-interface
export interface IFormGenConfig extends IComponentGenConfig {}

export function genForm(config: IFormGenConfig) {
  const model = parseModel(config.model);
  if (!model) {
    return;
  }
  const fileName = `${model.className}Form`;
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
  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());

  function setImports() {
    file.addImport(["React"], "react", true);
    file.addImport(["ReactElement", "useEffect", "useState"], "react");
    file.addImport(["Culture"], "@vesta/culture");
    file.addImport(["Violation"], "@vesta/core");
    file.addImport(["FormWrapper", "ComponentProps"], "@vesta/components");
    file.addImport([`fetch${model.className}`, "getErrors"], "./service");
    file.addImport([`save${model.className}`], "./service");
    file.addImport([model.interfaceName, model.className], "cmn/models");
    // props
    const props = file.addInterface(`${fileName}Props`);
    props.setParentClass(`ComponentProps`);
    props.addProperty({ name: "id", type: "number", isOptional: true });
    props.addProperty({ name: "goBack", type: `() => void` });
  }

  function setContent() {
    method.addParameter({ name: "props", type: `${fileName}Props` });
    // method.methodType = `ComponentType<${fileName}Props>`;
    method.shouldExport = true;
    method.returnType = "ReactElement";
    // method.isArrow = true;

    method.appendContent(`
    const tr = Culture.getDictionary().translate;
    ${getAllEnums()}
    
    const [${model.instanceName}, set${model.className}] = useState<Partial<${model.interfaceName}>>({});
    const [violations, setViolations] = useState<Violation<${model.interfaceName}> | null>(null);`);

    // relations

    for (const field of relationalFields) {
      const fieldMeta: IFieldMeta = getFieldMeta(config.model, field.name);
      if (!fieldMeta.form) {
        continue;
      }
      file.addImport([`I${fieldMeta.relation.model}`], "cmn/models");
      // extStates.push(pluralName);
      method.appendContent(`const [${field.name}, set${upperFirst(field.name)}] = useState<I${fieldMeta.relation.model}[]>([]);`);
    }

    // call fetch methods for all relations with showAll option
    // fetch functions for relations
    const callToFetchRelationsMethods = [];

    for (const field of relationalFields) {
      const meta: IFieldMeta = getFieldMeta(config.model, field.name);
      if (!meta.form || !meta.relation || !meta.relation.model) {
        continue;
      }
      const methodPostfix = pascalCase(field.name);
      file.addImport([`fetch${methodPostfix}`], "./service");
      if (meta.relation.showAllOptions) {
        callToFetchRelationsMethods.push(`fetch${methodPostfix}().then(set${methodPostfix});`);
      }
    }

    method.appendContent(`
    function onChange(name:string, value: any){
      set${model.className}({ ...${model.instanceName}, [name]: value});
    }

    async function onSubmit(){
      try {
        await save${model.className}(${model.instanceName})
        props.goBack();
      } catch(error) {
        setViolations(error.violations)
      }
    }

    useEffect(() => {
      ${callToFetchRelationsMethods.join("\n\t\t")}
      const id = +props.id;
      if (isNaN(id)) { return; }
      fetch${model.className}(id).then(set${model.className});
    }, [props.id]);`);

    // render
    const formData = getFormData();
    // const extStateCode = extStates.length ? `, ${extStates.join(", ")}` : "";
    const extraCode = formData.code ? `\n${formData.code}` : "";
    method.appendContent(`
    const errors = getErrors(violations);${extraCode}
  
    return (
      <FormWrapper name="${model.instanceName}Form" onSubmit={onSubmit}>${formData.form}
        {props.children}
      </FormWrapper>
    );`);
  }

  function getAllEnums() {
    const fields = schema.getFields();
    const code: string[] = [];
    for (const field of fields) {
      const fieldName = field.name;
      const fieldMeta = getFieldMeta(schema.name, fieldName);
      if (field.type === FieldType.Boolean) {
        file.addImport(["getFormOptions"], "@vesta/components");
        const boolOptionName = `${fieldName}Options`;
        code.push(`const ${boolOptionName} = getFormOptions(${model.className}, "${fieldName}");`);
      } else if (field.type === FieldType.Enum) {
        file.addImport(["getFormOptions"], "@vesta/components");
        if (!fieldMeta.enum) {
          continue;
        }
        const enumOptionsName = `${fieldName}Options`;
        if (fieldMeta.enum.name) {
          const options = fieldMeta.enum.options.map((option, index) => `{id: ${option}, title: tr("enum_${option.split(".")[1].toLowerCase()}")}`);
          code.push(`const ${enumOptionsName}: IFormOption[] = [ ${options.join(", ")} ];`);
        } else {
          code.push(`const ${enumOptionsName} = getFormOptions(${model.className}, "${fieldName}");`);
        }
      }
    }
    return code.join("\n\t");
  }

  function getFieldData(field: Field): IFormFieldData | null {
    const fieldName = field.name;
    if (fieldName === "id") {
      return null;
    }
    const fieldMeta: IFieldMeta = getFieldMeta(config.model, fieldName);
    if (!fieldMeta.form) {
      return null;
    }
    let form = "";
    // let formCode = "";
    const imports = [];
    let component = "";
    const properties = [
      `name="${fieldName}" label={tr("fld_${fieldName.toLowerCase()}")}`,
      `value={${model.instanceName}.${fieldName}}`,
      `error={errors.${fieldName}} onChange={onChange}`,
    ];
    switch (field.type) {
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
              file.addImport([enumName], "cmn/types");
            } else {
              file.addImport([enumName], fieldMeta.enum.path);
            }
          } else if (fieldMeta.enum.name) {
            file.addImport([enumName], "cmn/models");
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
        properties.push(`titleKey="${searchableField}"`);

        if (field.areManyOf) {
          // changing the value by casting type as number[]
          properties[1] = properties[1].replace("}", " as number[]}");
        }

        if (fieldMeta.relation.showAllOptions) {
          component = field.areManyOf ? "Multichoice" : "Select";
          properties.push(`options={${fieldName}}`);
        } else {
          // import relational model
          file.addImport([`I${relModelName}`], "cmn/models");
          file.addImport(["getApi"], "services/Api");
          const methodName = `search${pascalCase(fieldName)}`;
          const searchMethod = method.addMethod(methodName);
          searchMethod.addParameter({ name: "term", type: "string" });
          searchMethod.appendContent(
            // tslint:disable-next-line: max-line-length
            `return getApi()
            .get("${relInstanceName}", { query: { ${searchableField}: { contains: term } }, size: 10, fields: ["id", "${searchableField}"] })
            .then(({ items }) => items);`
          );
          component = "Autocomplete";
          properties.push(`onSearch={${methodName}}`);
          if (field.areManyOf) {
            properties.push(`multi={true}`);
          }
        }
        break;
      // case FieldType.List:
      //   component = "Multichoice";
      //   break;
      // case FieldType.Object:
      //   Log.warning(`Unsupported field type for ${fieldName}`);
      //   break;
      default:
        Log.error(`Unknown field type for ${fieldName} of type ${field.type}`);
    }
    if (component) {
      imports.push(component);
      form = `\n<${component} ${properties.shift()}\n`;
      form += `${properties.join(" ")} />`;
    }
    return { imports, form, code: "" };
  }

  function getFormData(): IFormFieldData {
    const fields = schema.getFields();
    let formComponents = "";
    let formComponentsToImport = [];
    const codes = [];
    for (const field of fields) {
      const fieldData = getFieldData(field);
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
    formComponentsToImport.forEach((component) => {
      if (importedComponents.indexOf(component) >= 0) {
        return;
      }
      file.addImport([component], "@vesta/components");
    });
    return { form: formComponents, code: codes.join("\n") };
  }
}
