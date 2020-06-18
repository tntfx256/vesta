import { Field, FieldType } from "@vesta/core";
import { mkdirpSync } from "fs-extra";
import { upperFirst } from "lodash";
import { isRelative, saveCodeToFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { getFieldForFormSelect, getFieldMeta, getFieldsByType, parseModel, getFieldsByListType } from "../../util/Model";
import { pascalCase, plural } from "../../util/StringUtil";
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
    file.addImport([`fetch${model.className}`, "getErrors"], `./${model.className}Service`);
    file.addImport([`save${model.className}`], `./${model.className}Service`);
    file.addImport([model.interfaceName], "cmn/models");
    // props
    const props = file.addInterface(`${fileName}Props`);
    props.setParentClass(`ComponentProps`);
    props.addProperty({ name: "id", type: "number", isOptional: true });
    props.addProperty({ name: "goBack", type: "Function" });
  }

  function setContent() {
    method.addParameter({ name: "props", type: `${fileName}Props` });
    method.shouldExport = true;
    method.returnType = "ReactElement";

    method.appendContent(`
    const tr = Culture.getDictionary().translate;
    ${getAllEnums()}
    
    const [${model.instanceName}, set${model.className}] = useState<Partial<${model.interfaceName}>>({});
    const [violations, setViolations] = useState<Violation<${model.interfaceName}> | null>(null);`);

    // relations
    for (const field of relationalFields) {
      const fieldName = String(field.name);
      const fieldMeta: IFieldMeta = getFieldMeta(config.model, fieldName);
      if (!fieldMeta.form || !fieldMeta.relation.showAllOptions) {
        continue;
      }
      file.addImport([`I${fieldMeta.relation.model}`], "cmn/models");
      const modelName = field.isOneOf ? plural(fieldName) : fieldName;
      method.appendContent(
        `const [${modelName}, set${upperFirst(modelName)}] = useState<I${fieldMeta.relation.model}[]>([]);`
      );
    }

    // call fetch methods for all relations with showAll option
    // fetch functions for relations
    const callToFetchRelationsMethods = [];

    for (const field of relationalFields) {
      const fieldName = String(field.name);
      const meta: IFieldMeta = getFieldMeta(config.model, fieldName);
      if (!meta.form || !meta.relation || !meta.relation.model) {
        continue;
      }
      const methodPostfix = field.isOneOf ? plural(pascalCase(fieldName)) : pascalCase(fieldName);
      if (meta.relation.showAllOptions) {
        file.addImport([`fetch${methodPostfix}`], `./${model.className}Service`);
        callToFetchRelationsMethods.push(`fetch${methodPostfix}().then(set${methodPostfix});`);
      } else {
        // search
        file.addImport([`search${methodPostfix}`], `./${model.className}Service`);
      }
    }

    // if it's list type
    let listFieldOnchange = "";
    const listFields = getFieldsByType(model.className, FieldType.List).filter(
      (f) => ![FieldType.Enum, FieldType.File].includes(f.listOf)
    );
    if (listFields.length == 1) {
      listFieldOnchange = `name==="${listFields[1]}"`;
    } else if (listFields.length > 1) {
      listFieldOnchange = `["${listFields.map((f) => f.name).join('","')}"].includes(name)`;
    }
    listFieldOnchange = listFieldOnchange
      ? `if(${listFieldOnchange}){
      set${model.className}({ ...${model.instanceName}, [name]: value.split(/\\s*,\\s*/)});
    }else{`
      : "";

    method.appendContent(`
    function onChange(name:string, value: any){
      ${listFieldOnchange}
      set${model.className}({ ...${model.instanceName}, [name]: value});${listFieldOnchange ? "}" : ""}
    }

    async function onSubmit(){
      try {
        const result = await save${model.className}(${model.instanceName})
        if(result){
          props.goBack();
        }
      } catch(error) {
        setViolations(error.violations)
      }
    }

    useEffect(() => {
      ${callToFetchRelationsMethods.join("\n")}
      const id = +props.id;
      if (isNaN(id)) { return; }
      fetch${model.className}(id).then(set${model.className});
    }, [props.id]);`);

    // render
    const formData = getFormData();
    method.appendContent(`
    const errors = getErrors(violations);
  
    return (
      <FormWrapper name="${model.instanceName}Form" onSubmit={onSubmit}>${formData}
        {props.children}
      </FormWrapper>
    );`);
  }

  function getAllEnums() {
    const fields = schema.getFields();
    const code: string[] = [];
    for (const field of fields) {
      const fieldName = String(field.name);
      const fieldMeta = getFieldMeta(schema.name, fieldName);
      if (field.type === FieldType.Boolean) {
        file.addImport(["getOptions"], `./${model.className}Service`);
        const boolOptionName = `${fieldName}Options`;
        code.push(`const ${boolOptionName} = getOptions("${fieldName}");`);
      } else if (field.type === FieldType.Enum) {
        file.addImport(["getOptions"], `./${model.className}Service`);
        if (!fieldMeta.enum) {
          continue;
        }
        const enumOptionsName = `${fieldName}Options`;
        code.push(`const ${enumOptionsName} = getOptions("${fieldName}");`);
      }
    }
    return code.join("\n");
  }

  function getFieldData(field: Field): string {
    const fieldName = String(field.name);
    if (fieldName === "id") {
      return "";
    }
    const fieldMeta: IFieldMeta = getFieldMeta(config.model, fieldName);
    if (!fieldMeta.form) {
      return "";
    }
    let form = "";
    // let formCode = "";
    const imports = [];
    let component = "";
    let value = `${model.instanceName}.${fieldName}`;
    const properties = [`name="${fieldName}" label={tr("fld_${fieldName.toLowerCase()}")}`];
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
        properties.push(`titleKey="${searchableField}"`);

        if (field.areManyOf) {
          value = `${value} as number[]`;
        }

        if (fieldMeta.relation.showAllOptions) {
          component = field.areManyOf ? "Multichoice" : "Select";
          properties.push(`options={${field.areManyOf ? fieldName : plural(fieldName)}}`);
        } else {
          // import relational model
          const methodName = `search${field.isOneOf ? plural(pascalCase(fieldName)) : pascalCase(fieldName)}`;
          component = "Autocomplete";
          properties.push(`onSearch={${methodName}}`);
          if (field.areManyOf) {
            properties.push(`multi={true}`);
          }
        }
        break;
      case FieldType.List:
        const result = getListFieldData(field);
        if (!result.component) {
          Log.warning(`Form: Unsupported field ${fieldName}: List<${FieldType[field.listOf]}>`);
          break;
        }
        component = result.component;
        value = result.value;
        properties.push(...result.props);
        break;
      case FieldType.Object:
        Log.warning(`Form: Unsupported field ${fieldName}: Object`);
        break;
      default:
        Log.error(`Form: Unknown field ${fieldName}: ${FieldType[field.type]}`);
    }
    if (component) {
      properties.splice(1, 0, `value={${value}}`, `onChange={onChange} error={errors.${fieldName}}`);
      file.addImport([component], "@vesta/components");
      form = `\n<${component} ${properties.shift()}\n`;
      form += `${properties.join(" ")} />`;
    }
    return form;
  }

  function getFormData(): string {
    const fields = schema.getFields();
    let formComponents = "";
    for (const field of fields) {
      const fieldData = getFieldData(field);
      if (!fieldData) {
        continue;
      }
      formComponents += fieldData;
    }
    return formComponents;
  }

  function getListFieldData(field: Field): { component: string; props: string[]; value: string } {
    const fieldName = String(field.name);
    const type = field.listOf;
    let component = "";
    let props: string[] = [];
    let value = `${model.instanceName}.${fieldName}`;
    switch (type) {
      case FieldType.String:
      case FieldType.Tel:
      case FieldType.EMail:
      case FieldType.URL:
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
        component = "TextInput";
        value = `${model.instanceName}.${fieldName}.join(", ")`;
        break;
      case FieldType.Enum:
        component = "Multichoice";
        file.addImport(["getOptions"], `./${model.className}Service`);
        props.push(`options={getOptions("${fieldName}")}`);
        break;
      case FieldType.File:
        component = "FileInput";
        props.push("multiple");
        break;
    }
    return { component, props, value };
  }
}
