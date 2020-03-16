import { Field, FieldType, IFieldProperties, RelationType } from "@vesta/core";
import { writeFileSync } from "fs-extra";
import { camelCase } from "lodash";
import { genRelativePath, isRelative } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { getFieldMeta, parseModel } from "../../util/Model";
import { pascalCase, tab } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";
import { Vesta } from "../Vesta";

interface IDetailFieldData {
  code: string;
  details: string;
}

export function genDetails(config: IComponentGenConfig) {
  const model = parseModel(config.model);
  const schema = model.module.schema;
  const fileName = `${model.className}Detail`;
  const file = new TsFileGen(fileName);
  const method = file.addMethod(fileName);
  const writtenOnce: any = {};
  method.isArrow = true;
  method.shouldExport = true;
  method.methodType = `ComponentType<I${fileName}Props>`;
  // imports
  file.addImport(["React"], "react", true);
  file.addImport(["ComponentType", "useEffect", "useState"], "react");
  file.addImport(["RouteComponentProps"], "react-router");
  file.addImport(["IComponentProps"], "@vesta/components");
  file.addImport([model.interfaceName], genRelativePath(config.path, `${Vesta.directories.model}/${model.className}`));
  file.addImport(["getCrudInstance"], genRelativePath(config.path, `src/service/Crud`));
  file.addImport(["Culture"], "@vesta/culture");
  // params
  const params = file.addInterface(`I${model.className}Params`);
  params.addProperty({ name: "id", type: "string" });

  // props
  const props = file.addInterface(`I${fileName}Props`);
  props.setParentClass(`IComponentProps, RouteComponentProps<${params.name}>`);
  method.addParameter({ name: "props", type: props.name });

  const { details: fields, code } = getDetailsData();
  // render method
  method.appendContent(`
    const tr = Culture.getDictionary().translate;
    const [${model.instanceName}, set${model.className}] = useState<${model.interfaceName}>(null);

    useEffect(() => {
        const id = +props.match.params.id;
        if (!id) { return; }
        getCrudInstance<${model.interfaceName}>("${model.instanceName}").fetch(id).then(set${model.className});
    }, [props.match.params.id]);

    if (!${model.instanceName}) { return null; }${code}

    return (
        <div className="crud-page">
            <table className="details-table">
                <tr>
                    <th colSpan={2}>{tr("title_record_detail", tr("${model.className.toLowerCase()}"), ${model.instanceName}.id)}</th>
                </tr>
                ${fields}
            </table>
        </div>
    );`);

  // generate file
  writeFileSync(`${config.path}/${fileName}.tsx`, file.generate());

  function getDetailsData(): IDetailFieldData {
    const allFields = schema.getFields();
    const columns = [];
    const codes = [];
    for (let fieldsName = Object.keys(allFields), i = 0, il = fieldsName.length; i < il; ++i) {
      const fieldData = getFieldData(schema.name, allFields[fieldsName[i]]);
      if (fieldData) {
        if (fieldData.details) {
          columns.push(fieldData.details);
        }
        if (fieldData.code) {
          codes.push(fieldData.code);
        }
      }
    }
    return {
      code: codes.length ? `\n\t${codes.join("\n\t")}` : "",
      details: columns.length ? columns.join("\n\t\t\t\t") : "",
    };
  }

  function getFieldData(modelName: string, field: Field): IDetailFieldData {
    const fieldName = field.fieldName;
    if (fieldName === "id") {
      return null as IDetailFieldData;
    }
    const fieldProps: IFieldProperties = field.properties;
    const fieldMeta: IFieldMeta = getFieldMeta(modelName, fieldName);
    const appDir = Vesta.directories.app;

    let details = "";
    let fieldCode = "";
    let value = "";

    switch (fieldProps.type) {
      case FieldType.String:
      case FieldType.Text:
      case FieldType.Tel:
      case FieldType.EMail:
      case FieldType.URL:
      case FieldType.Number:
      case FieldType.Integer:
      case FieldType.Float:
        value = `${model.instanceName}.${fieldName}`;
        break;
      case FieldType.Password:
        break;
      case FieldType.File:
        file.addImport(["getFileUrl"], genRelativePath(config.path, `${appDir}/util`));
        fieldCode = `const ${model.instanceName}${pascalCase(fieldName)} = getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${fieldName}}\`);`;
        value = `<img src={${model.instanceName}${pascalCase(fieldName)}} />`;
        break;
      case FieldType.Timestamp:
        if (!writtenOnce.dateTime) {
          writtenOnce.dateTime = true;
          fieldCode = `const dateTime = Culture.getDateTimeInstance();
        const dateTimeFormat = Culture.getLocale().defaultDateFormat;`;
        }
        value = `${model.instanceName}${pascalCase(fieldName)}`;
        fieldCode += `
        dateTime.setTime(${model.instanceName}.${fieldName});
        const ${value} = dateTime.format(dateTimeFormat);`;
        break;
      case FieldType.Boolean:
        value = `tr(${model.instanceName}.${fieldName} ? "yes" : "no")`;
        break;
      case FieldType.Enum:
        if (fieldMeta.enum) {
          const enumName = fieldMeta.enum.name;
          const enumOptionsName = `${camelCase(enumName)}Options`;
          const options = fieldMeta.enum.options.map((option, index) => `[${option}]: tr("enum_${option.split(".")[1].toLowerCase()}")`);
          fieldCode = `const ${enumOptionsName} = { ${options.join(", ")} };`;
          value = `${enumOptionsName}[${model.instanceName}.${fieldName}]`;
          // import enum from model file OR the path in meta
          if (fieldMeta.enum.path) {
            if (isRelative(fieldMeta.enum.path)) {
              file.addImport([enumName], genRelativePath(config.path, fieldMeta.enum.path || `${Vesta.directories.model}/${model.className}`));
            } else {
              file.addImport([enumName], fieldMeta.enum.path);
            }
          } else {
            file.addImport([enumName], genRelativePath(config.path, `${Vesta.directories.model}/${model.className}`));
          }
        }
        break;
      case FieldType.Relation:
        if (fieldMeta.relation) {
          switch (fieldProps.relation.type) {
            case RelationType.One2Many:
            case RelationType.Many2Many:
              // const schema: Schema = props.relation.model.schema;
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
        Log.error(`Unknown field type for ${fieldName} of type ${fieldProps.type}`);
    }
    if (value) {
      details = `<tr>\n${tab(5)}<td>{tr("fld_${fieldName.toLowerCase()}")}</td>\n${tab(5)}<td>{${value}}</td>\n${tab(4)}</tr>`;
    }
    return { details, code: fieldCode };
  }
}
