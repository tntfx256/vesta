import { Field, FieldType } from "@vesta/core";
import { genRelativePath, isRelative, saveCodeToFile } from "../../util/FsUtil";
import { getFieldForFormSelect, getFieldMeta, parseModel } from "../../util/Model";
import { pascalCase } from "../../util/StringUtil";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { IFieldMeta } from "../FieldGen";
import { Vesta } from "../Vesta";
import { camelCase } from "lodash";

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

  method.shouldExport = true;
  method.returnType = "ReactElement";
  // imports
  file.addImport(["React"], "react", true);
  file.addImport(["ReactElement", "useEffect", "useState"], "react");
  file.addImport(["RouteComponentProps"], "react-router-dom");
  file.addImport(["ComponentProps", "StyledDataTableWrapper", "StyledDataTable"], "@vesta/components");
  file.addImport([model.interfaceName], "cmn/models");
  file.addImport(["Culture"], "@vesta/culture");
  file.addImport([`fetch${model.className}`], `./${model.className}Service`);
  // params
  const params = file.addInterface(`${model.className}Params`);
  params.addProperty({ name: "id", type: "string" });

  // props
  const props = file.addInterface(`${fileName}Props`);
  props.setParentClass(`ComponentProps, RouteComponentProps<${params.name}>`);
  method.addParameter({ name: "props", type: props.name });

  const { details: fields, code } = getDetailsData();
  // render method
  method.appendContent(`
  const tr = Culture.getDictionary().translate;
  const [${model.instanceName}, set${model.className}] = useState<${model.interfaceName}>(null);

  useEffect(() => {
    const id = +props.match.params.id;
    if (!id) { return; }
    fetch${model.className}(id).then(set${model.className});
  }, [props.match.params.id]);

  if (!${model.instanceName}) { return null; }${code}

  return (
    <StyledDataTableWrapper>
      <StyledDataTable>
        <table className="details-table">
          <thead>
            <tr>
              <th colSpan={2}>{tr("title_record_detail", tr("${model.className.toLowerCase()}"), ${
    model.instanceName
  }.id)}</th>
            </tr>
          </thead>
          <tbody>
            ${fields}
            </tbody>
        </table>
      </StyledDataTable>
    </StyledDataTableWrapper>
  );`);

  // generate file
  saveCodeToFile(`${config.path}/${fileName}.tsx`, file.generate());

  function getDetailsData(): IDetailFieldData {
    const allFields = schema.getFields();
    const columns = [];
    const codes = [];
    for (let i = 0, il = allFields.length; i < il; ++i) {
      const fieldData = getFieldData(schema.name, allFields[i]);
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
      code: codes.length ? `\n${codes.join("\n")}` : "",
      details: columns.length ? columns.join("\n") : "",
    };
  }

  function getFieldData(modelName: string, field: Field): IDetailFieldData {
    const fieldName = String(field.name);
    if (fieldName === "id") {
      return null as IDetailFieldData;
    }
    const fieldMeta: IFieldMeta = getFieldMeta(modelName, fieldName);

    let details = "";
    let fieldCode = "";
    let value = "";
    let hasJsx = false;

    switch (field.type) {
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
        hasJsx = true;
        file.addImport(["getFileUrl"], "utils/helpers");
        // check if it's an image
        if (field.fileType.filter((type) => type.startsWith("image/")).length) {
          value = `<img src={getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${fieldName}}\`)} alt="${model.instanceName} ${fieldName}" />`;
        } else {
          value = `<a href={getFileUrl(\`${model.instanceName}/\${${model.instanceName}.${fieldName}}\`)}>${model.instanceName} ${fieldName}</a>`;
        }
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
        if (!fieldMeta.enum) {
          break;
        }
        const enumOptionsName = `${fieldName}Options`;
        if (fieldMeta.enum.name) {
          const enumName = fieldMeta.enum.name;
          const options = fieldMeta.enum.options.map(
            (option, index) => `[${option}]: tr("enum_${option.split(".")[1].toLowerCase()}")`
          );
          fieldCode = `const ${enumOptionsName} = { ${options.join(", ")} };`;
          value = `${enumOptionsName}[${model.instanceName}.${fieldName}]`;
          // import enum from model file OR the path in meta
          if (fieldMeta.enum.path) {
            if (isRelative(fieldMeta.enum.path)) {
              file.addImport(
                [enumName],
                genRelativePath(config.path, fieldMeta.enum.path || `${Vesta.directories.model}/${model.className}`)
              );
            } else {
              file.addImport([enumName], fieldMeta.enum.path);
            }
          } else {
            file.addImport([enumName], genRelativePath(config.path, `${Vesta.directories.model}/${model.className}`));
          }
        } else {
          file.addImport(["getOptions"], `./${model.className}Service`);
          // file.addImport([model.className], "cmn/models");
          fieldCode = `const ${enumOptionsName} = getOptions("${fieldName}");`;
          value = `${enumOptionsName}[${model.instanceName}.${fieldName}]`;
        }
        break;
      case FieldType.Relation:
        const relationModelName = field.isOneOf ? field.isOneOf.schema.name : field.areManyOf.schema.name;
        const relationInstance = camelCase(relationModelName);
        const name = getFieldForFormSelect(relationModelName);
        if (name) {
          file.addImport([`I${relationModelName}`], "cmn/models");
          hasJsx = true;
          value = field.isOneOf
            ? `{(${model.instanceName}.${fieldName} as I${relationModelName}).${name}}`
            : `<ul>{(${model.instanceName}.${fieldName} as I${relationModelName}[]).map((${relationInstance})=> <li key={${relationInstance}.id}>{${relationInstance}.${name}}</li>)}</ul>`;
        }
        break;
      case FieldType.List:
        if (field.listOf === FieldType.File) {
          hasJsx = true;
          hasJsx = true;
          file.addImport(["getFileUrl"], "utils/helpers");
          // check if it's an image
          if (field.fileType.filter((type) => type.startsWith("image/")).length) {
            value = `{${model.instanceName}.${fieldName}.map((f:string)=> <img key={f} src={getFileUrl(\`${model.instanceName}/\${f}\`)} alt="${model.instanceName} ${fieldName}" />)}`;
          } else {
            value = `{${model.instanceName}.${fieldName}.map((f:string)=> <a key={f} href={getFileUrl(\`${model.instanceName}/\${f}\`)}>${model.instanceName} ${fieldName}</a>)}`;
          }
          break;
        }
      case FieldType.Object:
        value = `JSON.stringify(${model.instanceName}.${fieldName}, null, 2)`;
        break;
    }
    if (value) {
      details = `
      <tr>
        <th>{tr("fld_${fieldName.toLowerCase()}")}</th>
        <td>${hasJsx ? value : `{${value}}`}</td>
      </tr>`;
    }
    return { details, code: fieldCode };
  }
}
